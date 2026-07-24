![thumbnail](./apps/web/public/images/thumbnail.png)

# Ones To Watch For FrontEnd (KR) — Monorepo

**English** · [한국어](./README.md)

**Ones to Watch for FE** is a site that curates noteworthy blogs. It started as a personal record of interest and highlights posts that can be insightful for frontend developers.

This repo is a pnpm workspace monorepo that statically builds the same Notion-backed newsletter site with **ten different frameworks** and deploys them all to one GitHub Pages site.

## Structure

- `landing/` — variant-picker landing page deployed at the site root (`https://simyunsup.github.io/ones-to-watch-refactor-test/`).
- `apps/web` — static Astro site. Deployed at `/astro/`.
- `apps/react-router` — React Router v8 (framework mode, prerender) port. `/react-router/`.
- `apps/tanstack-router` — TanStack Start (static prerender) port. `/tanstack/`.
- `apps/kudzu` — [kudzu](https://github.com/kudzujs/kudzu) port. `/kudzu/`.
- `apps/hugo` — Hugo (Go binary, hugo-bin) port. `/hugo/`.
- `apps/vitepress` — VitePress custom-theme port. `/vitepress/`.
- `apps/docusaurus` — Docusaurus custom-plugin port. `/docusaurus/`.
- `apps/eleventy` — Eleventy (11ty) v3 port. `/eleventy/`.
- `apps/next-app` — Next.js App Router (output:export) port. `/next-app/`.
- `apps/next-pages` — Next.js Pages Router (output:export) port. `/next-pages/`.
- `apps/crawler` — Cloudflare Queue worker for newsletter thumbnail/bookmark crawling.
- `packages/notion-loader` — loader package that pulls Notion into Astro's Content Layer (`@otw/notion-loader`).
- `packages/notion-content` — framework-neutral Notion content fetcher (`@otw/notion-content`), used at build time by every variant except astro.

## Build Benchmark

Run `pnpm run build:stats` locally to refresh the table below (scripts/build-stats.mjs). CI measurement was removed — shared-runner variance made numbers unreliable and the bot commit polluted branches.

Type — **SSG-focused**: a tool whose reason for existing is static-site output. **SSG-capable**: a general-purpose app framework that also supports static export.

<!-- build-stats:start -->
| Variant | Based | Type | Build (s) | Total size | JS size | Files | Origin diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Eleventy 3.1.6 | Node (Nunjucks) | SSG-focused | 0.9 | 2.6 MB | 15.0 KB | 142 | - |
| Hugo 0.161.0 | Go (templates) | SSG-focused | 0.9 | 2.6 MB | 14.8 KB | 142 | - |
| Kudzu 0.5.8 | Kudzu (JSX, no vDOM) | SSG-focused | 0.9 | 2.6 MB | 15.9 KB | 145 | - |
| Astro 7.1.3 | Astro islands (vanilla) | SSG-focused | 1.8 | 4.1 MB | 99.9 KB | 152 | - |
| VitePress 1.6.4 | Vue | SSG-focused | 2.2 | 8.5 MB | 4.6 MB | 416 | - |
| Docusaurus 3.10.2 | React | SSG-focused | 2.5 | 5.0 MB | 2.3 MB | 284 | - |
| React Router 8.3.0 | React | SSG-capable | 3.0 | 6.8 MB | 323.4 KB | 285 | - |
| Next.js Pages Router 16.2.11 | React | SSG-capable | 3.8 | 6.5 MB | 529.0 KB | 303 | - |
| Next.js App Router 16.2.11 | React | SSG-capable | 4.4 | 14.4 MB | 637.0 KB | 1374 | - |
| TanStack Start 1.168.32 | React | SSG-capable | 7.5 | 6.5 MB | 333.4 KB | 146 | - |

_Measured locally via `pnpm run build:stats` (manual refresh); varies with content volume and machine. Sorted by build time asc. "Total size"/"Files" exclude image files (image handling differs per variant, so counting them would be an unfair comparison). "Origin diff" is the home-page pixel delta vs the live origin from `pnpm run origin:diff` (images/analytics blocked), or `-` if not run. Machine: Apple M1 Max · 10 cores · 64 GB RAM · darwin/arm64 · Node v24.17.0. Measured at: 2026-07-24T07:17:45.417Z_
<!-- build-stats:end -->

### CI snapshot (reference)

Last measured on GitHub Actions ubuntu-latest (2 cores) with real content (123 posts), back when there were 4 variants. Even with content, the pure build is under ~15s; the variant most sensitive to content scale is TanStack (prerender scales with page count, ×5.1 vs local). Historical CI numbers (RR 312.8s, etc.) were Notion fetch time, not build time (separated after the prefetch cache landed).

| Variant | Build (s) | Total size | JS size | Files | vs local |
| --- | --- | --- | --- | --- | --- |
| Astro 7.x | 7.9 | 5.0 MB | 99.9 KB | 157 | ×3.3 |
| React Router 7.x | 8.9 | 6.8 MB | 322.8 KB | 286 | ×3.4 |
| TanStack 1.x | 15.9 | 6.4 MB | 332.8 KB | 147 | ×5.1 |
| Kudzu 0.5.x | 1.4 | 2.5 MB | 15.9 KB | 146 | ×1.8 |

_Snapshot measured 2026-07-23 (manually kept, from the 4-variant / React Router v7 era). Total-size and file-count differences come from content presence; JS size is identical regardless of content. See the table above for current variants/versions._

## Real-world defects & constraints found

Only defects worth filing upstream — genuine framework bugs or undocumented constraints — are kept. Our own app config/history (monorepo workspace inference, use of deprecated APIs, etc.) and framework-intended constraints are excluded.

1. **TanStack Start — SPA transition hangs forever on subpath deploys (real bug)**
   `@tanstack/start-static-server-functions` fetches the prerendered server-function cache from the origin root (`/__tsr/staticServerFnCache/...`) as an absolute path. On a `/<repo>/` subpath deploy like GitHub Pages that request 404s, the route stays pending, and the client transition never completes (deep links are fine since they're prerendered HTML → not reproducible in local dev). This repo works around it by vendoring the middleware base-aware (`apps/tanstack-router/src/lib/staticFunctionMiddleware.ts`, prefixing `import.meta.env.BASE_URL`).
2. **Next.js App Router — `output: "export"` build fails when `generateStaticParams()` returns an empty array**
   Pages Router (`getStaticPaths` → `paths: []`, `fallback: false`) accepts an empty collection, but App Router kills the static-export build if a dynamic route yields zero paths. This repo defends against it with a sentinel path (`_none`) + `dynamicParams = false` + `notFound()` when the collection is empty (`apps/next-app/src/app/news/post/[id]/page.tsx`). A case of the same framework's two routers behaving differently in the same situation.
3. **VitePress — dynamic routes cannot emit directory-style pretty URLs**
   `[page].md` dynamic routes always emit flat `<param>.html` files regardless of `cleanUrls` (no `/news/list/1/index.html` form). Because GitHub Pages serves extensionless requests as `.html`, `cleanUrls: true` matches the URL contract of the other variants, but the trailing-slash behavior differs.
4. **Docusaurus — a custom plugin's `addRoute` paths must be baseUrl-prefixed**
   `<BrowserRouter>` is mounted without a basename (core `clientEntry.js`), so the client matches the full URL including baseUrl. If a plugin registers unprefixed paths (`/`, `/news/list/1`) via `addRoute`, SSG (which drives StaticRouter directly) is fine, but on hydration nothing matches and it falls back to the catch-all `@theme/NotFound` → React #418. Register with `normalizeUrl([baseUrl, path])` (same transform as core content plugins / `useBaseUrl`).

## Verification tools (local only)

- `pnpm run build:stats` — measure clean-build time/size per variant → refresh the README tables.
- `pnpm run perf:bench` — Lighthouse desktop (variant × home/archive, median of 3) + home→archive routing transition → `bench/report.md`.
- `pnpm run origin:diff` — pixel diff of deployed variants against the live origin (ones-to-watch.ethansup.net).
- `pnpm run visual:diff` — cross-variant pixel diff of local builds (astro as baseline).
- `pnpm run test:e2e` — Playwright e2e (variant × 5 scenarios).

## Development

Node.js is required (fnm recommended, see `.nvmrc`). There are no non-Node tools like Lume; the Hugo binary is fetched automatically by the `hugo-bin` package on install.

```bash
corepack enable # if pnpm is missing

pnpm install

pnpm dev
```

`pnpm build` builds `apps/web`; `pnpm build:variants` compiles `@otw/notion-content` then the other 9 variants; `pnpm build:all` builds all ten apps.

## Deploy

The CI deploy workflow was removed — deploys run locally.

```bash
pnpm run deploy:pages              # prefetch → build:all → assemble site/ → push gh-pages branch
pnpm run deploy:pages -- --skip-build  # assemble & push from already-built output only
```

`scripts/deploy-pages.mjs` prefetches Notion once, builds every variant, assembles `site/` with the same `assembleSite()` layout the bench/e2e tools use, then force-pushes an orphan commit to the `gh-pages` branch (no accumulated history). One-time: set the Pages source to the `gh-pages` branch in GitHub Settings → Pages (the script attempts this via gh api).

## Content

Content loading needs the `NOTION_TOKEN` and `NOTION_DATABASE_ID` environment variables (local `.env`).
Without them `@otw/notion-loader`/`@otw/notion-content` build an empty collection cleanly, so the site itself never fails to build even without secrets.

For direct content contributions, please reach out to [SimYunSup](https://github.com/SimYunSup) or open an issue!

## License

MIT License
