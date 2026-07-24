#!/usr/bin/env node
// Measures clean-build wall-clock time and static output size for each of
// the ten framework variants, labelling every row with the framework's
// installed version, then rewrites the `<!-- build-stats:start -->` …
// `<!-- build-stats:end -->` section of the root README with a markdown
// table. Run locally via `pnpm run build:stats`.
//
// Pure Node — no external dependencies.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const startMarker = "<!-- build-stats:start -->";
const endMarker = "<!-- build-stats:end -->";

const skipBuild = process.argv.includes("--skip-build");

// Package that both react-router and tanstack (and kudzu) build against;
// built once up front and excluded from the measured table.
const contentPackage = "@otw/notion-content";

// `kind` classifies each variant for the README table: "SSG 특화" = the tool
// exists to emit static sites; "SSG 지원" = a general app framework that can
// also export statically. Korean/English kept together so the bilingual
// README columns stay in sync from one source.
const SSG_FOCUSED = { ko: "SSG 특화", en: "SSG-focused" };
const SSG_CAPABLE = { ko: "SSG 지원", en: "SSG-capable" };

// Reads the installed version of `dep` as resolved for the app at `appDir`
// (its own node_modules first, then the workspace root), so the table pins
// the exact framework version each variant actually built with — not the
// package.json range. Returns null if it can't be resolved.
function versionOf(appDir, dep) {
  const candidates = [
    path.join(repoRoot, appDir, "node_modules", dep, "package.json"),
    path.join(repoRoot, "node_modules", dep, "package.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf8")).version;
      } catch {
        // fall through to next candidate
      }
    }
  }
  return null;
}

// `versionDep` is the framework npm package whose installed version labels the
// row (e.g. "Astro 7.0.2"); `appDir` locates its install. `based` names the
// underlying runtime/UI tech. `diffKey` matches the VARIANTS key used in
// origin-diff/summary.md so the origin pixel-diff column can be joined in.
const variants = [
  { label: "Astro", pkg: "@otw/web", appDir: "apps/web", versionDep: "astro", based: "Astro islands (vanilla)", diffKey: "astro", outDir: path.join(repoRoot, "apps/web/dist"), kind: SSG_FOCUSED },
  {
    label: "React Router",
    pkg: "@otw/web-react-router",
    appDir: "apps/react-router",
    versionDep: "react-router",
    based: "React",
    diffKey: "react-router",
    outDir: path.join(repoRoot, "apps/react-router/build/client"),
    kind: SSG_CAPABLE,
  },
  {
    label: "TanStack Start",
    pkg: "@otw/web-tanstack",
    appDir: "apps/tanstack-router",
    versionDep: "@tanstack/react-start",
    based: "React",
    diffKey: "tanstack",
    diffLabel: "TanStack",
    outDir: path.join(repoRoot, "apps/tanstack-router/dist/client"),
    kind: SSG_CAPABLE,
  },
  { label: "Kudzu", pkg: "@otw/web-kudzu", appDir: "apps/kudzu", versionDep: "@kudzujs/core", based: "Kudzu (JSX, no vDOM)", diffKey: "kudzu", outDir: path.join(repoRoot, "apps/kudzu/dist"), kind: SSG_FOCUSED },
  { label: "Hugo", pkg: "@otw/web-hugo", appDir: "apps/hugo", versionDep: "hugo-bin", based: "Go (templates)", diffKey: "hugo", outDir: path.join(repoRoot, "apps/hugo/public"), kind: SSG_FOCUSED },
  {
    label: "VitePress",
    pkg: "@otw/web-vitepress",
    appDir: "apps/vitepress",
    versionDep: "vitepress",
    based: "Vue",
    diffKey: "vitepress",
    outDir: path.join(repoRoot, "apps/vitepress/.vitepress/dist"),
    kind: SSG_FOCUSED,
  },
  {
    label: "Docusaurus",
    pkg: "@otw/web-docusaurus",
    appDir: "apps/docusaurus",
    versionDep: "@docusaurus/core",
    based: "React",
    diffKey: "docusaurus",
    outDir: path.join(repoRoot, "apps/docusaurus/build"),
    kind: SSG_FOCUSED,
  },
  {
    label: "Eleventy",
    pkg: "@otw/web-eleventy",
    appDir: "apps/eleventy",
    versionDep: "@11ty/eleventy",
    based: "Node (Nunjucks)",
    diffKey: "eleventy",
    outDir: path.join(repoRoot, "apps/eleventy/_site"),
    kind: SSG_FOCUSED,
  },
  {
    label: "Next.js App Router",
    pkg: "@otw/web-next-app",
    appDir: "apps/next-app",
    versionDep: "next",
    based: "React",
    diffKey: "next-app",
    outDir: path.join(repoRoot, "apps/next-app/out"),
    kind: SSG_CAPABLE,
  },
  {
    label: "Next.js Pages Router",
    pkg: "@otw/web-next-pages",
    appDir: "apps/next-pages",
    versionDep: "next",
    based: "React",
    diffKey: "next-pages",
    outDir: path.join(repoRoot, "apps/next-pages/out"),
    kind: SSG_CAPABLE,
  },
];

// Image extensions excluded from the size totals below. Only astro bundles
// Notion content images into its own build output (via astro:assets); the
// other variants reference remote/deploy-localized images, so counting image
// bytes would inflate astro's "총 출력 크기" and make the cross-variant size
// comparison apples-to-oranges. Excluding images keeps the column a fair
// measure of code/markup output only.
const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico",
]);

/** Recursively walk a directory, returning { totalBytes, jsBytes, fileCount }.
 *  Image files are skipped entirely (see IMAGE_EXTENSIONS). */
function collectDirStats(dir) {
  const stats = { totalBytes: 0, jsBytes: 0, fileCount: 0 };
  if (!existsSync(dir)) return stats;

  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      const size = statSync(entryPath).size;
      stats.totalBytes += size;
      stats.fileCount += 1;
      if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) {
        stats.jsBytes += size;
      }
    }
  }
  return stats;
}

/** Auto-format a byte count as B / KB / MB. */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Run `pnpm --filter <pkg> build`, inheriting stdio and env. Returns true on success. */
function runBuild(pkg) {
  const result = spawnSync("pnpm", ["--filter", pkg, "build"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  return result.status === 0;
}

/**
 * Parse origin-diff/summary.md (written by `pnpm run origin:diff`) into a
 * { <variant label>: "<ratio>" } map, using the HOME page section's "Diff
 * 비율" column as the representative origin-vs-deployed pixel delta. Returns
 * an empty map (→ "-" cells) when the report is absent, so build:stats never
 * depends on having run origin:diff first.
 */
function loadOriginDiff() {
  const summaryPath = path.join(repoRoot, "origin-diff", "summary.md");
  if (!existsSync(summaryPath)) return {};
  const md = readFileSync(summaryPath, "utf8");
  // Only read rows under the first "## " page section (home): stop at the
  // next page heading so archive rows don't overwrite home values.
  const lines = md.split("\n");
  const map = {};
  let inFirstSection = false;
  let sectionsSeen = 0;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      sectionsSeen += 1;
      inFirstSection = sectionsSeen === 1 && !line.includes("각주");
      continue;
    }
    if (!inFirstSection) continue;
    // Data row: | 변형 | 크기 | Diff 픽셀 | Diff 비율 | 비고 |
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 6) continue;
    const label = cells[1];
    const ratio = cells[4];
    if (!label || label === "변형" || ratio === "Diff 비율") continue;
    map[label] = ratio;
  }
  return map;
}

async function main() {
  let anyFailure = false;
  const rows = [];

  if (!skipBuild) {
    console.log(`build-stats: building ${contentPackage} (prerequisite, not measured)`);
    const contentOk = runBuild(contentPackage);
    if (!contentOk) {
      console.error(`build-stats: ${contentPackage} build failed; downstream builds will likely fail too`);
    }
  }

  for (const variant of variants) {
    if (skipBuild) {
      const stats = collectDirStats(variant.outDir);
      rows.push({ variant, ok: true, seconds: null, stats });
      continue;
    }

    // Clean output directory to guarantee a fresh build.
    rmSync(variant.outDir, { recursive: true, force: true });

    console.log(`build-stats: building ${variant.pkg}`);
    const start = process.hrtime.bigint();
    const ok = runBuild(variant.pkg);
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;

    if (!ok) {
      anyFailure = true;
      rows.push({ variant, ok: false, seconds, stats: null });
      continue;
    }
    const stats = collectDirStats(variant.outDir);
    rows.push({ variant, ok: true, seconds, stats });
  }

  const originDiff = loadOriginDiff();
  // Sort by build time ascending (fastest first); un-measured (--skip-build,
  // seconds=null) and failed builds sink to the bottom.
  const sortedRows = [...rows].sort((a, b) => {
    const sa = a.seconds == null || !a.ok ? Infinity : a.seconds;
    const sb = b.seconds == null || !b.ok ? Infinity : b.seconds;
    return sa - sb;
  });
  const measuredAt = new Date().toISOString();

  // Machine spec the numbers were measured on — recorded in the footnote so
  // the (machine-dependent) build times are interpretable and reproducible.
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model?.replace(/\s+/g, " ").trim() ?? "unknown CPU";
  const totalGiB = Math.round(os.totalmem() / 1024 ** 3);
  const specEn = `${cpuModel} · ${cpus.length} cores · ${totalGiB} GB RAM · ${process.platform}/${process.arch} · Node ${process.version}`;
  const specKo = `${cpuModel} · ${cpus.length}코어 · RAM ${totalGiB} GB · ${process.platform}/${process.arch} · Node ${process.version}`;

  // Build the localized table (header + divider + rows + footnote) for one
  // language, then inject it between the markers in that language's README.
  const L = {
    ko: {
      header: "| 변형 | 기반 | 특징 | 빌드 시간(s) | 총 출력 크기 | JS 크기 | 파일 수 | 원본 대비 diff |",
      kind: (v) => v.kind.ko,
      footnote: `_로컬에서 \`pnpm run build:stats\`로 측정(수동 갱신), 콘텐츠 양·머신에 따라 변동. 빌드 시간 오름차순 정렬. "총 출력 크기"·"파일 수"는 이미지 파일 제외(변형별 이미지 처리 방식 차이로 인한 불공정 비교 방지). "원본 대비 diff"는 \`pnpm run origin:diff\`가 만든 홈 화면 픽셀 diff(라이브 원본 대비, 이미지·분석 스크립트 차단 상태)이며 없으면 \`-\`. 측정 머신: ${specKo}. 측정 시각: ${measuredAt}_`,
    },
    en: {
      header: "| Variant | Based | Type | Build (s) | Total size | JS size | Files | Origin diff |",
      kind: (v) => v.kind.en,
      footnote: `_Measured locally via \`pnpm run build:stats\` (manual refresh); varies with content volume and machine. Sorted by build time asc. "Total size"/"Files" exclude image files (image handling differs per variant, so counting them would be an unfair comparison). "Origin diff" is the home-page pixel delta vs the live origin from \`pnpm run origin:diff\` (images/analytics blocked), or \`-\` if not run. Machine: ${specEn}. Measured at: ${measuredAt}_`,
    },
  };
  const divider = "| --- | --- | --- | --- | --- | --- | --- | --- |";

  function renderTable(lang) {
    const t = L[lang];
    const tableRows = sortedRows.map(({ variant, ok, seconds, stats }) => {
      const version = versionOf(variant.appDir, variant.versionDep);
      const name = version ? `${variant.label} ${version}` : variant.label;
      const based = variant.based;
      const kind = t.kind(variant);
      const time = seconds === null ? "-" : seconds.toFixed(1);
      const diff = originDiff[variant.diffLabel ?? variant.label] ?? "-";
      if (!ok) {
        return `| ${name} | ${based} | ${kind} | ${time} | ❌ | ❌ | ❌ | ${diff} |`;
      }
      return `| ${name} | ${based} | ${kind} | ${time} | ${formatBytes(stats.totalBytes)} | ${formatBytes(stats.jsBytes)} | ${stats.fileCount} | ${diff} |`;
    });
    return [t.header, divider, ...tableRows, "", t.footnote].join("\n");
  }

  // Inject the table between the markers in a README file; skips (with a
  // warning) any target that is missing or lacks the markers, so a repo with
  // only README.md still works.
  async function injectInto(file, lang) {
    const absPath = path.join(repoRoot, file);
    if (!existsSync(absPath)) {
      console.warn(`build-stats: ${file} not found, skipping`);
      return;
    }
    const readme = await readFile(absPath, "utf8");
    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1) {
      console.warn(`build-stats: markers not found in ${file}, skipping`);
      return;
    }
    const before = readme.slice(0, startIndex + startMarker.length);
    const after = readme.slice(endIndex);
    await writeFile(absPath, `${before}\n${renderTable(lang)}\n${after}`);
    console.log(`build-stats: ${file} updated (${measuredAt})`);
  }

  await injectInto("README.md", "ko");
  await injectInto("README.en.md", "en");

  // Emit the same measurements as machine-readable JSON for the landing page
  // (landing/index.html) to fetch and render — so the on-site benchmark table
  // refreshes automatically on every `build:stats` run without hand-editing
  // HTML. Sorted identically (build time asc) to the README table.
  const benchmark = {
    measuredAt,
    machine: { ko: specKo, en: specEn },
    rows: sortedRows.map(({ variant, ok, seconds, stats }) => {
      const version = versionOf(variant.appDir, variant.versionDep);
      return {
        label: variant.label,
        version,
        name: version ? `${variant.label} ${version}` : variant.label,
        based: variant.based,
        kind: variant.kind,
        ok,
        seconds: seconds === null ? null : Number(seconds.toFixed(1)),
        totalBytes: ok ? stats.totalBytes : null,
        jsBytes: ok ? stats.jsBytes : null,
        totalSize: ok ? formatBytes(stats.totalBytes) : null,
        jsSize: ok ? formatBytes(stats.jsBytes) : null,
        fileCount: ok ? stats.fileCount : null,
        originDiff: originDiff[variant.diffLabel ?? variant.label] ?? null,
      };
    }),
  };
  await writeFile(
    path.join(repoRoot, "landing", "benchmark.json"),
    `${JSON.stringify(benchmark, null, 2)}\n`,
  );
  console.log(`build-stats: landing/benchmark.json updated (${measuredAt})`);

  if (anyFailure) {
    console.error("build-stats: one or more builds failed");
    process.exit(1);
  }
}

await main();
