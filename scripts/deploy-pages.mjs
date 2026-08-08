#!/usr/bin/env node
// Local GitHub Pages deploy — replaces the old .github/workflows/deploy.yml
// CI pipeline. Rationale: with ten variants a CI matrix build got slow and
// approval-heavy, and every content tweak burned Actions minutes; building on
// the developer machine (where the Notion cache/secrets already live) and
// pushing the assembled artifact is both faster and exactly reproduces what
// the local bench/e2e tools already exercise via scripts/lib/site-server.mjs.
//
// What it does:
//   1. (unless --skip-build) prefetch Notion content once into
//      notion-cache/news-entries.json, then build all variants with
//      NOTION_CONTENT_CACHE pointing at it (astro still fetches live via
//      notion-loader — its own pipeline).
//   2. Assemble the Pages artifact into site/ (same layout the bench/e2e
//      tools serve) + .nojekyll (Next.js emits _next/ which Jekyll would
//      otherwise drop).
//   3. Commit site/ as the root tree of the gh-pages branch (fresh orphan
//      commit each deploy — no history accumulation) and push it.
//
// One-time repo setting: Pages must serve from the gh-pages branch
// ("Deploy from a branch"). The script attempts to set this via `gh api`
// and prints a hint if that fails.
//
// Usage: node ./scripts/deploy-pages.mjs [--skip-build]
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assembleSite } from "./lib/site-server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const siteDir = path.join(repoRoot, "site");
const skipBuild = process.argv.includes("--skip-build");

/** Run a command, streaming output; exit on failure unless allowFail. */
function run(cmd, args, opts = {}) {
  const { allowFail = false, env = {} } = opts;
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0 && !allowFail) {
    console.error(`deploy-pages: \`${cmd} ${args.join(" ")}\` failed (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
  return result.status === 0;
}

/** Run a command and capture stdout (trimmed); exit on failure. */
function capture(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`deploy-pages: \`${cmd} ${args.join(" ")}\` failed: ${result.stderr}`);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

if (!skipBuild) {
  // One Notion fetch for every variant build (same defense the old CI
  // prefetch job provided — RR v8's prerender has a hard 10s per-request
  // timeout that a live full-database fetch would blow past).
  run("pnpm", ["run", "prefetch:content"]);
  run("pnpm", ["run", "build:all"], {
    env: { NOTION_CONTENT_CACHE: path.join(repoRoot, "notion-cache", "news-entries.json") },
  });
}

assembleSite(repoRoot, siteDir, { toolName: "deploy-pages" });
// Next.js emits _next/ — Jekyll (Pages' default processor) drops _-prefixed
// dirs, so opt out of Jekyll entirely.
writeFileSync(path.join(siteDir, ".nojekyll"), "");

// Localize Notion's presigned S3 images across every assembled variant.
// Notion `type: "file"` images are served from prod-files-secure.s3 behind a
// presigned URL that expires ~1h after Notion mints it (X-Amz-Expires=3600).
// All variants except astro (which runs them through astro:assets at build
// time) bake that URL straight into their output, so once deployed the images
// 403 as soon as the signature lapses. Rather than patching ten different
// build pipelines — and the SPA variants embed each URL twice, once in the
// static <img src> and again in their hydration payload — this walks the
// single assembled artifact and rewrites every reference at once.
await localizeNotionImages(siteDir);

// Publish site/ as a fresh orphan commit on gh-pages without touching the
// current branch's working tree or index: stage site/ into a throwaway
// index (GIT_INDEX_FILE) with --work-tree pointed at site/, hash it into a
// tree object, wrap it in a parentless commit, point the branch at it, push.
// site/ is gitignored on the source branch, hence the explicit `add -f`.
// `.git` may be a file (worktree gitdir pointer), not a directory, so resolve
// the real git dir instead of hardcoding path.join(repoRoot, ".git", ...).
const gitDir = capture("git", ["rev-parse", "--absolute-git-dir"]);
const tmpIndex = path.join(gitDir, "deploy-pages-index");
rmSync(tmpIndex, { force: true });
const snapshotEnv = { GIT_INDEX_FILE: tmpIndex };
function captureWithEnv(cmd, args, env) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: "utf8", env: { ...process.env, ...env } });
  if (result.status !== 0) {
    console.error(`deploy-pages: \`${cmd} ${args.join(" ")}\` failed: ${result.stderr}`);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}
captureWithEnv("git", ["--work-tree", siteDir, "add", "-Af", "."], snapshotEnv);
const treeHash = captureWithEnv("git", ["write-tree"], snapshotEnv);
rmSync(tmpIndex, { force: true });
const commitMessage = `deploy: ${new Date().toISOString()}`;
const commitHash = capture("git", ["commit-tree", treeHash, "-m", commitMessage]);
run("git", ["update-ref", "refs/heads/gh-pages", commitHash]);
// gh-pages is a disposable build-artifact branch (fresh orphan commit each
// deploy, no shared history), so a force push is the intended, safe update
// — it never touches source branches. Run by a developer locally, not CI.
run("git", ["push", "--force", "origin", "gh-pages"]);

// Best-effort: make sure Pages serves the gh-pages branch. Fails harmlessly
// if already configured or if the token lacks admin scope.
const configured = run(
  "gh",
  ["api", "-X", "POST", "repos/{owner}/{repo}/pages", "-f", "build_type=legacy", "-f", "source[branch]=gh-pages", "-f", "source[path]=/"],
  { allowFail: true },
) || run(
  "gh",
  ["api", "-X", "PUT", "repos/{owner}/{repo}/pages", "-f", "build_type=legacy", "-f", "source[branch]=gh-pages", "-f", "source[path]=/"],
  { allowFail: true },
);
if (!configured) {
  console.warn(
    "deploy-pages: could not switch the Pages source automatically — set it once in Settings → Pages → 'Deploy from a branch' → gh-pages.",
  );
}

console.log("deploy-pages: pushed gh-pages — the site will update in a minute or two.");

/** Recursively collect every text file (by extension) under `dir`. */
async function collectTextFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    dirents.map((dirent) => {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) return collectTextFiles(full);
      // Only rewrite text formats that can carry a Notion URL. Downloaded
      // images live under assets/notion/ and are binary, so they never match.
      return /\.(html|js|json|txt)$/i.test(dirent.name) ? [full] : [];
    }),
  );
  return nested.flat();
}

/**
 * Download every presigned Notion S3 image referenced anywhere in the
 * assembled site and rewrite all references to a permanent local copy.
 *
 * The same URL appears in up to three encodings across the variants:
 *   1. HTML attribute entities — `&` written as `&amp;` (static <img src>).
 *   2. JS/JSON unicode escapes — `&` written as `\u0026` (SPA hydration
 *      payloads: react-router's streamed context, Next's flight data, etc.).
 *   3. Raw `&` — plain, unescaped.
 * Each encoded form is captured verbatim so it can be found-and-replaced
 * literally later, and separately decoded back to a real URL for fetching.
 */
async function localizeNotionImages(siteDir) {
  const files = await collectTextFiles(siteDir);

  // Three capture patterns for the same underlying URL. Each stops at the
  // delimiter its encoding can't contain, so the captured span is exactly the
  // encoded URL as it sits in the file.
  const patterns = [
    // HTML entity form: separators are `&amp;`; the span ends at `"`.
    /https:\/\/prod-files-secure\.s3\.[^"'\s\\<>]+/g,
    // JS unicode-escape form: `\u0026` separators are allowed inside; the span
    // ends at a quote, whitespace, or any other backslash escape.
    /https:\/\/prod-files-secure\.s3\.(?:\\u0026|[^"'\s\\])+/g,
  ];

  // decoded real URL -> Set of the encoded originals seen across all files.
  const decodedToEncoded = new Map();
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (!text.includes("prod-files-secure")) continue;
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const encoded = match[0];
        const decoded = encoded.replaceAll("\\u0026", "&").replaceAll("&amp;", "&");
        let set = decodedToEncoded.get(decoded);
        if (!set) {
          set = new Set();
          decodedToEncoded.set(decoded, set);
        }
        set.add(encoded);
      }
    }
  }

  if (decodedToEncoded.size === 0) return;

  // encoded original string -> local absolute path. Populated only for URLs
  // that download successfully; a failed fetch is warned about and left
  // pointing at its original (soon-to-expire) URL rather than failing deploy.
  const replacements = new Map();
  const assetsDir = path.join(siteDir, "assets", "notion");
  const decodedUrls = [...decodedToEncoded.keys()];

  // A full archive can reference dozens of images; a small fixed batch size
  // downloads them in parallel without hammering S3 all at once.
  const CONCURRENCY = 8;
  for (let i = 0; i < decodedUrls.length; i += CONCURRENCY) {
    const batch = decodedUrls.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        let objectKey;
        try {
          objectKey = new URL(url).pathname;
        } catch (error) {
          console.warn(`deploy-pages: skipping unparseable Notion image URL ${url}: ${String(error)}`);
          return;
        }
        // Pattern 1 stops at the first backslash, so for a `\u0026`-escaped
        // hydration URL it also yields a signature-less prefix fragment that
        // would always 403. Every real presigned URL carries X-Amz-Signature,
        // so skip anything without it — the full URL is still captured by the
        // `\u0026`-aware pattern and localized normally.
        if (!url.includes("X-Amz-Signature=")) return;
        // Hash only the object key, never the query string: the query carries
        // the presigned signature, which Notion mints fresh on every build, so
        // hashing the full URL would rename the same image on each rebuild.
        const hash = createHash("sha256").update(objectKey).digest("hex").slice(0, 16);
        // Restrict to the image extensions Notion actually serves; anything
        // else (or a key with no extension) falls back to .png. The static
        // server picks the response MIME type off this extension.
        const extMatch = /\.(png|jpe?g|gif|webp)$/i.exec(objectKey);
        const ext = extMatch ? extMatch[0].toLowerCase() : ".png";
        const localName = `${hash}${ext}`;
        const destPath = path.join(assetsDir, localName);
        // Assets live at the site root (not under any variant dir) so every
        // variant shares one copy via the same Pages-absolute URL regardless
        // of its own base prefix.
        const localSrc = `/kudzu-based-bench/assets/notion/${localName}`;

        // Skip the download when this object key was already fetched in this
        // run: several differently-signed URLs can point at the same image and
        // all hash to this one destPath, so one download is shared. A failed
        // fetch is warned and skipped, leaving the original (expiring) URL in
        // place rather than breaking the deploy over one missing asset.
        if (!existsSync(destPath)) {
          let res;
          try {
            res = await fetch(url);
          } catch (error) {
            console.warn(`deploy-pages: failed to fetch Notion image ${url}: ${String(error)}`);
            return;
          }
          if (!res.ok) {
            console.warn(`deploy-pages: failed to fetch Notion image ${url}: HTTP ${res.status}`);
            return;
          }
          await mkdir(assetsDir, { recursive: true });
          await writeFile(destPath, Buffer.from(await res.arrayBuffer()));
        }

        for (const encoded of decodedToEncoded.get(url)) {
          replacements.set(encoded, localSrc);
        }
      }),
    );
  }

  if (replacements.size === 0) return;

  let filesChanged = 0;
  for (const file of files) {
    let text = await readFile(file, "utf8");
    let changed = false;
    for (const [encoded, localSrc] of replacements) {
      if (text.includes(encoded)) {
        text = text.split(encoded).join(localSrc);
        changed = true;
      }
    }
    if (changed) {
      await writeFile(file, text);
      filesChanged++;
    }
  }
  // Count distinct localized images (unique local paths), not encoded refs:
  // one image embedded in multiple encodings maps to several `replacements`
  // entries but is a single downloaded file.
  const imageCount = new Set(replacements.values()).size;
  console.log(`deploy-pages: localized ${imageCount} images across ${filesChanged} files`);
}
