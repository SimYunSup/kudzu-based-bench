// Shared "assemble the GitHub Pages artifact + serve it locally" logic used
// by both scripts/visual-diff.mjs (screenshot parity) and
// scripts/perf-bench.mjs (Lighthouse + routing perf). Keeping this in one
// place means both tools exercise byte-for-byte the same site/ layout and
// URL structure that .github/workflows/deploy.yml actually publishes.
import { createReadStream, cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

// Must match the `base`/`basename`/`BASE` baked into each variant's build
// config (apps/web/astro.config.mjs, apps/react-router/{react-router,vite}.config.ts,
// apps/tanstack-router/vite.config.ts, apps/kudzu/kudzu.config.mjs) — this is
// the GitHub Pages repo-name prefix every variant's routes are generated under.
export const BASE_PATH = "/kudzu-based-bench";

// astro is intentionally listed first: several consumers (visual-diff's
// BASELINE_VARIANT) treat it as the reference variant, and the remaining
// nine are compared/reported against it in this same order.
export const VARIANTS = [
  {
    key: "astro",
    label: "Astro",
    // Astro's `/` redirects to `/home` (see astro.config.mjs `redirects`);
    // navigate to the redirect target directly instead of following it.
    paths: { home: "/astro/home", archive: "/astro/news/list/1" },
  },
  {
    key: "react-router",
    label: "React Router",
    paths: { home: "/react-router/", archive: "/react-router/news/list/1" },
  },
  {
    key: "tanstack",
    label: "TanStack",
    paths: { home: "/tanstack/", archive: "/tanstack/news/list/1" },
  },
  {
    key: "kudzu",
    label: "Kudzu",
    paths: { home: "/kudzu/", archive: "/kudzu/news/list/1" },
  },
  {
    key: "hugo",
    label: "Hugo",
    paths: { home: "/hugo/", archive: "/hugo/news/list/1" },
  },
  {
    key: "vitepress",
    label: "VitePress",
    paths: { home: "/vitepress/", archive: "/vitepress/news/list/1" },
  },
  {
    key: "docusaurus",
    label: "Docusaurus",
    paths: { home: "/docusaurus/", archive: "/docusaurus/news/list/1" },
  },
  {
    key: "eleventy",
    label: "Eleventy",
    paths: { home: "/eleventy/", archive: "/eleventy/news/list/1" },
  },
  {
    key: "next-app",
    label: "Next.js App Router",
    paths: { home: "/next-app/", archive: "/next-app/news/list/1" },
  },
  {
    key: "next-pages",
    label: "Next.js Pages Router",
    paths: { home: "/next-pages/", archive: "/next-pages/news/list/1" },
  },
];

export const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

/**
 * Rebuild site/ from every variant's build output (including the
 * react-router two-step merge + cleanup) via node:fs. This is the single
 * source of truth for the Pages artifact layout — scripts/deploy-pages.mjs
 * publishes exactly what this assembles.
 *
 * @param {string} repoRoot absolute path to the monorepo root
 * @param {string} siteDir absolute path to assemble the Pages artifact into
 * @param {{ toolName?: string, shop?: boolean, form?: boolean, docs?: boolean }} [opts]
 *   error-message prefix (defaults to "site-server") and whether to include
 *   the commerce / form-wizard / docs fixtures (each defaults to true,
 *   skipped when those apps have not been built)
 */
export function assembleSite(repoRoot, siteDir, opts = {}) {
  const toolName = opts.toolName ?? "site-server";
  // Straight `cp -R <dist>/. site/<key>/` sources. react-router is special
  // (below): its export nests HTML under the basename inside build/client.
  const distSources = {
    astro: path.join(repoRoot, "apps/web/dist"),
    tanstack: path.join(repoRoot, "apps/tanstack-router/dist/client"),
    kudzu: path.join(repoRoot, "apps/kudzu/dist"),
    hugo: path.join(repoRoot, "apps/hugo/public"),
    vitepress: path.join(repoRoot, "apps/vitepress/.vitepress/dist"),
    docusaurus: path.join(repoRoot, "apps/docusaurus/build"),
    eleventy: path.join(repoRoot, "apps/eleventy/_site"),
    "next-app": path.join(repoRoot, "apps/next-app/out"),
    "next-pages": path.join(repoRoot, "apps/next-pages/out"),
  };

  // Commerce fixture. Optional rather than required: it is a separate
  // benchmark with its own build command, and `pnpm run build:all` (which
  // only covers the newsletter variants) must keep working on its own.
  const shopSources = {
    "shop-kudzu": path.join(repoRoot, "apps/shop-kudzu/dist"),
    "shop-astro": path.join(repoRoot, "apps/shop-astro/dist"),
    "shop-tanstack": path.join(repoRoot, "apps/shop-tanstack/dist"),
    "shop-next-app": path.join(repoRoot, "apps/shop-next-app/out"),
  };
  // shop-react-router already hoists its own output flat (see that app's
  // scripts/flatten-build.mjs), so unlike the newsletter react-router it
  // needs no merge here.
  const shopReactRouter = path.join(repoRoot, "apps/shop-react-router/build/client");
  const includeShop = opts.shop !== false
    && Object.values(shopSources).every(existsSync)
    && existsSync(shopReactRouter);
  if (includeShop) {
    Object.assign(distSources, shopSources, { "shop-react-router": shopReactRouter });
  } else if (opts.shop) {
    console.error(`${toolName}: commerce variants requested but not built. Run \`pnpm run build:shop\` first.`);
    process.exit(1);
  }

  // Form-wizard fixture, same optional pattern as the commerce fixture.
  // form-react-router flattens its own output (scripts/flatten-build.mjs).
  const formSources = {
    "form-kudzu": path.join(repoRoot, "apps/form-kudzu/dist"),
    "form-astro": path.join(repoRoot, "apps/form-astro/dist"),
    "form-tanstack": path.join(repoRoot, "apps/form-tanstack/dist"),
    "form-next-app": path.join(repoRoot, "apps/form-next-app/out"),
    "form-react-router": path.join(repoRoot, "apps/form-react-router/build/client"),
  };
  const includeForm = opts.form !== false && Object.values(formSources).every(existsSync);
  if (includeForm) {
    Object.assign(distSources, formSources);
  } else if (opts.form) {
    console.error(`${toolName}: form variants requested but not built. Run \`pnpm run build:form\` first.`);
    process.exit(1);
  }

  // Docs+search fixture, same optional pattern.
  const docsSources = {
    "docs-kudzu": path.join(repoRoot, "apps/docs-kudzu/dist"),
    "docs-astro": path.join(repoRoot, "apps/docs-astro/dist"),
    "docs-eleventy": path.join(repoRoot, "apps/docs-eleventy/_site"),
    "docs-docusaurus": path.join(repoRoot, "apps/docs-docusaurus/build"),
    "docs-vitepress": path.join(repoRoot, "apps/docs-vitepress/.vitepress/dist"),
  };
  const includeDocs = opts.docs !== false && Object.values(docsSources).every(existsSync);
  if (includeDocs) {
    Object.assign(distSources, docsSources);
  } else if (opts.docs) {
    console.error(`${toolName}: docs variants requested but not built. Run \`pnpm run build:docs\` first.`);
    process.exit(1);
  }

  const reactRouterClient = path.join(repoRoot, "apps/react-router/build/client");
  const landingDir = path.join(repoRoot, "landing");

  for (const [name, dir] of Object.entries({ ...distSources, reactRouterClient, landing: landingDir })) {
    if (!existsSync(dir)) {
      console.error(
        `${toolName}: missing build output for ${name} at ${dir}. Run \`pnpm run build:all\` first, or pass --site <already-assembled-dir>.`,
      );
      process.exit(1);
    }
  }

  rmSync(siteDir, { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });

  // Root: static landing hub linking to the framework variants.
  cpSync(landingDir, siteDir, { recursive: true });

  for (const [key, dir] of Object.entries(distSources)) {
    mkdirSync(path.join(siteDir, key), { recursive: true });
    cpSync(dir, path.join(siteDir, key), { recursive: true });
  }

  // react-router emits HTML under its basename inside build/client; merge
  // assets (root) + pages (base-prefixed dir) into site/react-router, then
  // drop the now-redundant nested basename tree.
  const reactRouterDir = path.join(siteDir, "react-router");
  mkdirSync(reactRouterDir, { recursive: true });
  cpSync(reactRouterClient, reactRouterDir, { recursive: true });
  cpSync(
    path.join(reactRouterClient, "kudzu-based-bench", "react-router"),
    reactRouterDir,
    { recursive: true },
  );
  rmSync(path.join(reactRouterDir, "kudzu-based-bench"), { recursive: true, force: true });

  console.log(`${toolName}: assembled site at ${siteDir}`);
  return siteDir;
}

/** Resolve a filesystem path to a servable file: itself, its index.html (if a
 * directory), or a `${path}.html` sibling (covers flat non-directory output). */
export function resolveStaticFile(absPath) {
  if (existsSync(absPath)) {
    const st = statSync(absPath);
    if (st.isFile()) return absPath;
    if (st.isDirectory()) {
      const indexPath = path.join(absPath, "index.html");
      return existsSync(indexPath) ? indexPath : null;
    }
  }
  const htmlPath = `${absPath}.html`;
  return existsSync(htmlPath) ? htmlPath : null;
}

/**
 * Minimal static file server reproducing the GitHub Pages URL structure:
 * everything is served under the `basePath` (default `BASE_PATH`, stripped
 * before resolving against `siteDir`), directories fall back to index.html,
 * and anything unresolved is a 404.
 *
 * @param {string} siteDir absolute path to the assembled Pages artifact
 * @param {number} port 0 lets the OS pick a free port
 * @param {string} [basePath]
 * @returns {Promise<import("node:http").Server>}
 */
export function startServer(siteDir, port, basePath = BASE_PATH) {
  const server = createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://localhost");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const isUnderBase = pathname === basePath || pathname.startsWith(`${basePath}/`);
      if (!isUnderBase) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end(`Not found (outside ${basePath} base path)`);
        return;
      }

      let rest = pathname.slice(basePath.length);
      if (rest === "") rest = "/";
      const absPath = path.join(siteDir, path.normalize(rest));
      if (!absPath.startsWith(siteDir)) {
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }

      const resolved = resolveStaticFile(absPath);
      if (!resolved) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, { "content-type": MIME_TYPES[ext] ?? "application/octet-stream" });
      createReadStream(resolved).pipe(res);
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Internal error: ${err.message}`);
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/**
 * Abort every request that doesn't target our own static server. Used to
 * make screenshots deterministic (visual-diff) and, optionally, to run
 * Lighthouse/routing measurements in a fully offline mode (perf-bench
 * `--offline`) — at the cost of external assets (web fonts, analytics,
 * embeds) falling back or failing to load. Every variant loses the exact
 * same external assets, so cross-variant comparisons stay fair.
 */
export async function blockExternalRequests(page, serverOrigin) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(serverOrigin)) {
      return route.continue();
    }
    return route.abort();
  });
}
