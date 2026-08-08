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

Commerce fixture (separate from the newsletter; this is what measures interaction):

- `packages/commerce-data` — deterministic catalog generator (`@otw/commerce-data`). The seed is fixed, so a given size always produces the same bytes. `OTW_CATALOG_SIZE` switches between 100/1,000/10,000.
- `apps/shop-kudzu` — Kudzu 0.8.15, native document navigation.
- `apps/shop-astro` — Astro 7 with three React islands (`client:load`).
- `apps/shop-react-router` — React Router v8 framework mode, every route prerendered.
- `apps/shop-tanstack` — TanStack Start static prerender.
- `apps/shop-next-app` — Next.js App Router `output: "export"`.

## Build Benchmark

Run `pnpm run build:stats` locally to refresh the table below (scripts/build-stats.mjs). CI measurement was removed — shared-runner variance made numbers unreliable and the bot commit polluted branches.

Type — **SSG-focused**: a tool whose reason for existing is static-site output. **SSG-capable**: a general-purpose app framework that also supports static export.

<!-- build-stats:start -->
| Variant | Based | Type | Build (ms) | Total size | JS size | Files | Origin diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hugo 0.161.0 | Go (templates) | SSG-focused | 689 | 2.6 MB | 14.8 KB | 142 | 0.395% |
| Eleventy 3.1.6 | Node (Nunjucks) | SSG-focused | 698 | 2.7 MB | 15.0 KB | 142 | 0.400% |
| Kudzu 0.8.15 | Kudzu (JSX, no vDOM) | SSG-focused | 821 | 2.6 MB | 15.0 KB | 141 | 0.395% |
| VitePress 1.6.4 | Vue | SSG-focused | 1721 | 8.5 MB | 4.6 MB | 416 | 0.402% |
| React Router 8.3.0 | React | SSG-capable | 2159 | 6.8 MB | 323.4 KB | 285 | 0.405% |
| Next.js Pages Router 16.2.11 | React | SSG-capable | 3092 | 6.5 MB | 528.1 KB | 303 | 0.403% |
| Next.js App Router 16.2.11 | React | SSG-capable | 3458 | 14.4 MB | 636.9 KB | 1374 | 0.401% |
| Astro 7.1.3 | Astro islands (vanilla) | SSG-focused | 4179 | 4.7 MB | 99.9 KB | 152 | 0.320% |
| Docusaurus 3.10.2 | React | SSG-focused | 5056 | 5.0 MB | 2.2 MB | 284 | 0.403% |
| TanStack Start 1.168.32 | React | SSG-capable | 5658 | 6.5 MB | 333.4 KB | 146 | 0.399% |

_Measured locally via `pnpm run build:stats` (manual refresh). Build time is the **median** of 3 clean builds per variant after one discarded warm-up, and still varies with content volume and machine. Per-run values are in `samples` in `landing/benchmark.json`. Sorted by build time asc. "Total size"/"Files" exclude image files (image handling differs per variant, so counting them would be an unfair comparison). "Origin diff" is the home-page pixel delta vs the live origin from `pnpm run origin:diff` (images/analytics blocked), or `-` if not run. Machine: Apple M4 · 10 cores · 16 GB RAM · darwin/arm64 · Node v24.17.0. Measured at: 2026-08-08T02:22:07.272Z_
<!-- build-stats:end -->

## Commerce Benchmark

The newsletter variants have no interaction, so rendering architecture never shows up in their numbers. A Next.js Commerce-sized storefront (home · search · collection · product · policy · checkout) is implemented on five frameworks under **one shared DOM and behaviour contract**, and measured by replaying a real session.

```bash
pnpm run build:shop     # build all five (OTW_CATALOG_SIZE=100|1000|10000)
pnpm run shop:bench     # session replay + click loss + degradation
pnpm run shop:assets    # per-route JS weight (bytes the browser actually fetched)
pnpm run shop:scale     # build time vs catalog size
```

### Why not Cold LCP / Warm LCP

Nobody has a "cold visit" and a "warm visit". People have a session: the first page opens with an empty cache and the next four or five reuse it. Splitting that into two buckets throws away how the cost is distributed. And a storefront's LCP is the product photo, which is byte-identical across variants here, so it says nothing about the framework.

Four metrics instead:

| Metric | Definition |
| --- | --- |
| contentReady | navigationStart → the step's key text (title, price) is in the DOM |
| actReady | until the control **actually works**, probed by retrying every 50 ms; no framework internals are consulted |
| stepLatency | successful dispatch → next paint. Same definition as INP |
| Click loss | share of add-to-cart clicks at first paint + Δ that do nothing |

### Session replay (median of 5, 4x CPU · Slow 4G)

| Variant | Entry contentReady | First listing actReady | Sort stepLatency | Add stepLatency | First reliable click |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kudzu 0.8.15 | 173 ms | **250 ms** | 2.3 ms | 1.0 ms | **first paint +300 ms** |
| Astro 7 (islands) | 234 ms | 2,214 ms | 11.7 ms | 2.4 ms | +1,500 ms |
| TanStack Start | 173 ms | 2,950 ms | 7.6 ms | 1.8 ms | +2,000 ms |
| React Router v8 | 174 ms | 2,959 ms | 29.4 ms | 2.0 ms | +2,000 ms |
| Next.js App Router | 175 ms | 3,768 ms | 29.9 ms | 2.1 ms | +3,000 ms |

**contentReady is effectively tied** — all five ship complete HTML. The entire difference sits in becoming operable, which is the reason this fixture exists.

Click loss is measured in **separate sessions** from the journey. Sweeping the delay grid to 5 s means reopening the product page twenty-odd times, which warms the module cache enough to make the journey's following actReady look far better than it is — Next once collapsed from 3,768 ms to 0.1 ms purely from probe ordering.

### Initial JavaScript per route (KB gzip)

Bytes the browser actually downloaded. Static import-graph analysis gives different answers per framework: Astro pulls its island runtime through a dynamic `import()` inside inline bootstrap, so a static crawler counts 60 KB as 1.8 KB.

| Variant | Home | Search | Product | Checkout | Total output (images excluded) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kudzu | **4.6** | 9.3 | 4.9 | **4.6** | 1.20 MB |
| Astro | 60.6 | 61.0 | 61.1 | 60.6 | 1.75 MB |
| React Router | 104.2 | 104.2 | 104.5 | 104.1 | 1.12 MB |
| TanStack | 104.0 | 103.9 | 104.1 | 103.6 | 1.62 MB |
| Next.js | 145.5 | 146.2 | 145.2 | 144.4 | 4.83 MB |

Only Kudzu varies by route (+4.7 KB of keyed-list runtime on search). The rest pay the same weight on the checkout page as on the home page. Astro's island split is real, but as long as the cart badge lives in global chrome, every route pays for react-dom.

### Degradation resilience

How many of six capabilities (read info · browse category · open detail · filter · select option · add to cart) survive three conditions. These are the states an ad blocker, a captive portal, a partial CDN outage, or a subway tunnel actually produce.

| Variant | JS blocked | Scripts 2s late | One script lost | Total |
| --- | ---: | ---: | ---: | ---: |
| Kudzu | 3/6 | 6/6 | 6/6 | **15/18** |
| Astro | 3/6 | 3/6 | 6/6 | 12/18 |
| TanStack | 3/6 | 2/6 | 4/6 | 9/18 |
| Next.js | 3/6 | 2/6 | 3/6 | 8/18 |
| React Router | 3/6 | 2/6 | 3/6 | 8/18 |

With JS fully off all five keep exactly read, browse, and open-detail — static documents plus native anchors. They diverge when scripts are merely late or one chunk is missing.

### Catalog scaling (clean / incremental, median)

Incremental means one product's price changed and nothing else. That is the real cost of a nightly inventory batch, and the number every "N pages in M seconds" headline omits.

| Variant | 100 | 1,000 | Per page (1,000) |
| --- | ---: | ---: | ---: |
| Astro | 1,436 / 1,403 ms | **1,833 / 1,938 ms** | 1.83 ms |
| TanStack | 2,169 / 2,212 ms | 3,090 / 3,213 ms | 3.09 ms |
| React Router | 1,883 / 1,978 ms | 3,257 / 3,371 ms | 3.26 ms |
| Next.js | 3,616 / 3,789 ms | 4,716 / 5,832 ms | 4.72 ms |
| Kudzu | **1,536 / 1,567 ms** | 5,963 / 6,211 ms | 5.96 ms |

**Kudzu loses here** — fastest at 100 products, slowest at 1,000. It emits a separate effect module and native handler module per product, so build cost is driven by per-route capability ESM emission rather than by page rendering. No variant supports incremental builds: clean and incremental are the same everywhere.

_Machine: Apple M4 · 10 cores · 16 GB RAM · darwin/arm64 · Node v24.17.0. Raw JSON lands in `bench/` (git-ignored)._

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
- `pnpm run build:shop` — build the five commerce variants (`OTW_CATALOG_SIZE` picks the catalog size).
- `pnpm run shop:bench -- --variant shop-kudzu` — session replay, click loss, degradation → `bench/<variant>.json`.
- `pnpm run shop:assets` — measure per-route initial JS in a browser → `bench/shop-assets.json`.
- `pnpm run shop:scale -- --sizes 100,1000,10000` — clean/incremental build time by catalog size → `bench/shop-scale.json`.

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
