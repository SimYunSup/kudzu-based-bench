# kudzu-based-bench

**English** · [한국어](./README.md)

A pnpm workspace monorepo that statically builds the same site with several frameworks to measure **what actually differs**. Synthetic operations (a 1,000-row reverse, ops/sec) are not measured — real sessions are replayed instead, and only what a user can observe counts as the verdict.

There are four fixtures.

| Fixture | Variants | What it reveals | Build · measure |
| --- | --- | --- | --- |
| [Newsletter](#newsletter-build-benchmark) | 10 | Build cost, output size | `build:variants` · `build:stats` |
| [Commerce](#commerce-benchmark) | 5 | Hydration, session interaction, degradation resilience | `build:shop` · `shop:bench` |
| [Form Wizard](#form-wizard-benchmark) | 5 | Progressive enhancement, cross-step state transport | `build:form` · `form:bench` |
| [Docs + Search](#docs--search-benchmark) | 5 | Client-side search latency, index cost | `build:docs` · `docs:bench` |

<details>
<summary>Name and measurement philosophy</summary>

The name is kudzu because this project started from [kudzu](https://github.com/kudzujs/kudzu), not because it's built with kudzu. All 25 variants are benchmarked, and the axes where kudzu loses (catalog-scale builds, form state transport, etc.) are published unchanged.

- **Newsletter** — the Notion content behind [Ones to Watch for FE](https://ones-to-watch.ethansup.net). No interaction, so only build cost and output are measured.
- **Commerce** — a Next.js Commerce-sized storefront. Six routes — home · search (filter/sort) · collection · product detail (options, add to cart) · policy · checkout — implemented under one shared DOM and behavior contract.
- **Form Wizard** — a three-step workshop application. State travels through a native GET form chain plus query-string state transport. Its reason for existing is what survives when scripts arrive late or not at all.
- **Docs + Search** — a documentation site over a deterministic corpus (120 pages by default) plus client-side search. The real cost of "a search index on top of static content."

Every data package (`@otw/commerce-data`, `@otw/docs-data`) is a seed-fixed deterministic generator, so nothing varies except the framework.
</details>

## Newsletter Build Benchmark

Same Notion content, built ten ways. Running `pnpm run build:stats` locally refreshes the table below automatically.

<!-- build-stats:start -->
| Variant | Based | Type | Cold (ms) | Warm (ms) | Total size | JS size | Files | Origin diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Eleventy 3.1.6 | Node (Nunjucks) | SSG-focused | 702 | 691 | 2.7 MB | 15.0 KB | 142 | 0.400% |
| Hugo 0.161.0 | Go (templates) | SSG-focused | 710 | 691 | 2.6 MB | 14.8 KB | 142 | 0.395% |
| Kudzu 0.8.39 | Kudzu (JSX, no vDOM) | SSG-focused | 785 | 789 | 2.6 MB | 15.0 KB | 141 | 0.395% |
| VitePress 1.6.4 | Vue | SSG-focused | 1638 | 1644 | 8.5 MB | 4.6 MB | 416 | 0.402% |
| React Router 8.3.0 | React | SSG-capable | 2161 | 2122 | 6.8 MB | 323.0 KB | 285 | 0.405% |
| Next.js Pages Router 16.3.0 | React | SSG-capable | 3660 | 2687 | 6.4 MB | 529.9 KB | 304 | 0.403% |
| Next.js App Router 16.3.0 | React | SSG-capable | 4491 | 2961 | 13.7 MB | 589.0 KB | 698 | 0.401% |
| TanStack Start 1.168.42 | React | SSG-capable | 4847 | 4898 | 6.5 MB | 326.1 KB | 146 | 0.399% |
| Docusaurus 3.10.2 | React | SSG-focused | 4919 | 1574 | 5.0 MB | 2.2 MB | 284 | 0.403% |
| Astro 7.2.1 | Astro islands (vanilla) | SSG-focused | 6013 | 2483 | 3.1 MB | 99.9 KB | 152 | 0.320% |

_Measured locally via `pnpm run build:stats` (manual refresh). **Cold** deletes the output and every framework build cache (a CI cache miss); **warm** deletes only the output and keeps the caches (a CI cache hit, or your second local build). The gap between them is what that tool's cache actually buys. Each is the median of 3 runs after one discarded warm-up; per-run values are in `coldSamples`/`warmSamples` in `landing/benchmark.json`. Sorted by cold asc. "Total size"/"Files" exclude image files (image handling differs per variant, so counting them would be an unfair comparison). "Origin diff" is the home-page pixel delta vs the live origin from `pnpm run origin:diff` (images/analytics blocked), or `-` if not run. Machine: Apple M4 · 10 cores · 16 GB RAM · darwin/arm64 · Node v24.17.0. Measured at: 2026-08-12T05:03:43.802Z_
<!-- build-stats:end -->

<details>
<summary>Variant → directory mapping</summary>

| App | Tool | Deploy path |
| --- | --- | --- |
| `apps/web` | Astro (islands) | `/astro/` |
| `apps/react-router` | React Router v8 (framework mode, prerender) | `/react-router/` |
| `apps/tanstack-router` | TanStack Start (static prerender) | `/tanstack/` |
| `apps/kudzu` | [kudzu](https://github.com/kudzujs/kudzu) | `/kudzu/` |
| `apps/hugo` | Hugo (Go binary, hugo-bin) | `/hugo/` |
| `apps/vitepress` | VitePress custom theme | `/vitepress/` |
| `apps/docusaurus` | Docusaurus custom plugin | `/docusaurus/` |
| `apps/eleventy` | Eleventy (11ty) v3 | `/eleventy/` |
| `apps/next-app` | Next.js App Router (`output: "export"`) | `/next-app/` |
| `apps/next-pages` | Next.js Pages Router (`output: "export"`) | `/next-pages/` |

Automated CI measurement was removed — shared-runner performance variance made the numbers unreliable, and bot commits polluted branches.
</details>

## Commerce Benchmark

The same storefront built five ways (`apps/shop-*`, deploy path `/shop-*/`): Kudzu 0.8.39 · Astro 7 + React islands · React Router v8 · TanStack Start · Next.js App Router. All of them ship complete HTML, so "time to visible content" is a tie — every difference concentrates in **time to operable**.

```bash
pnpm run build:shop     # OTW_CATALOG_SIZE=100|1000|10000
pnpm run shop:bench     # session replay + click loss + back button + session transfer + degradation
pnpm run shop:assets    # per-route JS weight (measured in a browser)
pnpm run shop:scale     # build time by catalog size
```

### Session replay (median of 5 sessions, 4x CPU · Slow 4G)

| Variant | Entry contentReady | First listing actReady | Sort stepLatency | Add stepLatency | First reliable click |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kudzu | 170 ms | **250 ms** | 2.2 ms | 0.8 ms | **first paint +300 ms** |
| Astro (islands) | 223 ms | 2,229 ms | 9.1 ms | 1.5 ms | +1,500 ms |
| TanStack Start | 170 ms | 2,859 ms | 15.3 ms | 1.0 ms | +2,000 ms |
| React Router v8 | 170 ms | 2,957 ms | 17.6 ms | 1.1 ms | +2,000 ms |
| Next.js App Router | 178 ms | 3,537 ms | 26.8 ms | 0.9 ms | +3,000 ms |

### Navigation contract — click transitions · back button · session transfer

A session doesn't only move forward. Products are opened from the listing with a **real anchor click** (routers intercept it; document sites load a new document), added to the cart, then the grid is returned to via **back button**. The clock is a single wall clock (sessionStorage) that survives document swaps, so MPA and SPA are measured with the same ruler.

| Variant | Listing→detail (click) | Back button | Filter survives | Sort survives | Total session transfer | Of which scripts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kudzu | 271 ms | 33 ms | 0/5 | 5/5 | **244.9 KB** | **34.4 KB** |
| Astro (islands) | 222 ms | 34 ms | 0/5 | 5/5 | 529.9 KB | 193.1 KB |
| React Router v8 | **185 ms** | 14 ms | 0/5 | 0/5 | 616.9 KB | 322.3 KB |
| TanStack Start | **182 ms** | 13 ms | 0/5 | 0/5 | 616.3 KB | 317.6 KB |
| Next.js App Router | 360 ms | 46 ms | 0/5 | 5/5 | 792.1 KB | 455.5 KB |

Client-side transitions are the one axis where SPA routers genuinely win (React Router · TanStack at 182–185 ms). In exchange, they drop sort state on back navigation — the component remounts and the select resets, whereas the document-navigation variants keep it because Chrome's form restoration carries it over. Session transfer is CDP-measured across the whole session, so it includes prefetch waste, and the script gap between Kudzu and Next is 13x over the full session.

<details>
<summary>Measurement detail: metric definitions, why not Cold/Warm LCP, back-button footnote</summary>

| Metric | Definition |
| --- | --- |
| contentReady | navigationStart → that step's key text (product name, price) exists in the DOM |
| actReady | until the control **actually works**. Measured by retrying every 50 ms; framework-internal signals are not consulted |
| stepLatency | successful dispatch → next paint. Same definition as INP |
| nav (click · back) | gesture → target content shown. Measured with a single sessionStorage wall clock so document swaps and router transitions use the same ruler |
| Click loss rate | share of "add to cart" clicks at first paint + Δ that get ignored |
| Session transfer | CDP `Network` bytes measured across the whole session (the local server serves uncompressed — same condition for every variant) |

People don't have a "cold visit" and a "warm visit." Within one session, the first page opens with an empty cache, and every following page inherits it. Splitting that into two buckets erases how the cost is distributed across a session, and a storefront's LCP is the product photo — which is byte-identical across variants in this fixture — so it says nothing about the framework.

Click loss is measured in a **separate session** from the journey. Sweeping the Δ grid out to 5 seconds warms the module cache enough that the following journey's actReady looks far better than it really is (Next once collapsed from 3,768 ms to 0.1 ms this way).

Back-button state is sampled 300 ms after arrival. The filter (search input value + collapsed-grid state) is lost on all five variants — it's component state that isn't carried in the URL. Scroll restoration was measured unrestored on all five variants in the same window and was dropped from the table (under CDP throttling, restoration timing can land outside the window, so it can't distinguish between variants).
</details>

### Initial JavaScript per route (KB gzip)

Bytes the browser actually downloaded. Static import-graph analysis gives a different answer per framework — Astro pulls its island runtime through a dynamic `import()` inside an inline bootstrap, so a static crawler miscounts a 60 KB payload as 1.8 KB.

| Variant | Home | Search | Product | Checkout | Total output (images excluded) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kudzu | **4.7** | 9.4 | 4.9 | **4.7** | 1.14 MB |
| Astro | 60.6 | 61.0 | 61.1 | 60.6 | 1.72 MB |
| React Router | 104.3 | 104.2 | 104.4 | 103.9 | 1.09 MB |
| TanStack | 101.7 | 101.7 | 101.9 | 101.3 | 1.66 MB |
| Next.js | 134.2 | 134.8 | 133.8 | 132.8 | 4.24 MB |

Only Kudzu varies by route (the search page's keyed-list runtime, +4.7 KB). Astro's island split is real, but as long as the cart badge lives in the global header, every route pays for the react-dom runtime. Next.js dropped from the 145 KB range to the 134 KB range going 16.2 → 16.3, and TanStack from the 104 KB range to the 101 KB range with vite 7 → 8 + @vitejs/plugin-react 6.

### Degradation resilience

How many of six capabilities (read info · browse category · open detail · filter · select option · add to cart) survive three conditions. These are the states an ad blocker, a captive portal, a partial CDN outage, or a subway tunnel actually produce.

| Variant | JS blocked | Scripts 2s late | 1 script lost | Total |
| --- | ---: | ---: | ---: | ---: |
| Kudzu | 3/6 | 6/6 | 6/6 | **15/18** |
| Astro | 3/6 | 3/6 | 6/6 | 12/18 |
| TanStack | 3/6 | 2/6 | 3/6 | 8/18 |
| Next.js | 3/6 | 2/6 | 3/6 | 8/18 |
| React Router | 3/6 | 2/6 | 3/6 | 8/18 |

TanStack's "1 script lost" cell wobbles ±1 between runs (3–4/6) depending on which chunk gets dropped — its chunk graph is sensitive to content-hash ordering.

### Catalog scaling (cold / warm, median)

| Variant | 100 items | 1,000 items | Per page (1,000) |
| --- | ---: | ---: | ---: |
| Astro | 1,373 / 1,328 ms | **1,818 / 1,875 ms** | 1.82 ms |
| TanStack | 1,582 / 1,552 ms | 2,471 / 2,490 ms | 2.47 ms |
| React Router | 1,820 / 1,860 ms | 3,073 / 2,996 ms | 3.07 ms |
| Kudzu | **1,279 / 1,275 ms** | 3,557 / 3,568 ms | 3.56 ms |
| Next.js | 4,314 / 3,213 ms | 5,624 / 5,000 ms | 5.62 ms |

Kudzu's scaling slope is still the steepest (2.8x from 100 → 1,000 items; Astro grows 1.3x) — it emits a separate effect and native-handler module per product, so build cost is driven by per-route capability ESM emission. But 0.8.15 → 0.8.39 improved the 1,000-item absolute time from 5.8 s to 3.6 s, handing last place to Next.js, and TanStack got roughly 15–20% faster builds from vite 7 → 8, taking second place at 1,000 items. Next 16.3 is the first variant whose commerce cold and warm builds diverge (the other four still tie — the only caches that do real work remain Docusaurus and Astro in the newsletter fixture).

## Form Wizard Benchmark

The same three-step application wizard (`apps/form-*`, deploy path `/form-*/`) built on five frameworks. Participant info → session pick → confirm → done; state travels through the query string of a **native GET form chain**, and JS is only used to prefill hidden inputs. All validation is native HTML5 attributes. The completion reference code (FNV-1a) is supposed to be **byte-identical** across all five variants, and in practice all 5 sessions × 5 variants matched `REF-09D7A58B`.

```bash
pnpm run build:form
pnpm run form:bench     # session replay + ref cross-check + degradation
```

### Session replay (median of 5 sessions, 4x CPU · Slow 4G)

| Variant | Entry contentReady | Conditional field toggle | Next-step arrival | State transport complete | Summary render |
| --- | ---: | ---: | ---: | ---: | ---: |
| Astro (inline script) | 198 ms | 0.8 ms | 180 ms | **200 ms** | 216 ms |
| TanStack Start | 174 ms | 2.4 ms | 183 ms | **189 ms** | **173 ms** |
| React Router v8 | 179 ms | 3.0 ms | **175 ms** | 399 ms | 370 ms |
| Next.js App Router | 182 ms | 1.9 ms | 188 ms | 362 ms | 370 ms |
| Kudzu | 180 ms | 0.7 ms | 179 ms | 702 ms | 520 ms |

**This is the axis Kudzu loses.** State transport (submit → the next step's hidden inputs are filled) only starts once the page's effect module arrives, and on Slow 4G that module-chain round trip becomes pure cost (702 ms — last place). TanStack burns 2.9 s on hydration in commerce, but here the router intercepts the submit and transitions within the same document, so the architecture works in its favor.

### Degradation resilience (step navigation · state transport · conditional toggle · summary render · reference render)

| Variant | JS blocked | Scripts 2s late | 1 script lost | Total |
| --- | ---: | ---: | ---: | ---: |
| Astro | 5/5 | 5/5 | 5/5 | **15/15** |
| Kudzu | 1/5 | 2/5 | 4/5 | 7/15 |
| TanStack | 2/5 | 2/5 | 3/5 | 7/15 |
| React Router | 1/5 | 1/5 | 4/5 | 6/15 |
| Next.js | 1/5 | 1/5 | 4/5 | 6/15 |

The "JS blocked" condition is the same as commerce — blocking `*.js` **requests**, a model for ad blockers and CDN failures, not disabling `<script>` execution. That's exactly why the Astro variant survives every condition: it ships per-page logic as **inline scripts** rather than external bundles, so request blocking never touches it. It's a real property the architecture produces, and it's reported as-is. Step navigation (native GET submit) survives without JS on all five variants — but state transport, the summary, and the ref, which all have to read the query string, structurally need JS on a static host.

<details>
<summary>Measurement detail</summary>

- Arrival metrics use a wall clock planted in sessionStorage right before submit. React Router and Next don't intercept the form, so a real document navigation happens; TanStack's router does intercept — measuring both by navigationStart would make the two incomparable. URL waiting uses `commit` (so a module script delaying `load` by several seconds doesn't get a successful navigation misjudged as a failure).
- Queries with a repeated key, like the diet checkboxes, are normalized with `URLSearchParams#getAll` semantics. TanStack's default JSON search codec overwrites repeated keys, so it uses a custom `parseSearch`/`stringifySearch`.
- Raw JSON: `bench/form-<variant>.json`.
</details>

## Docs + Search Benchmark

The same documentation site built on five SSGs (`apps/docs-*`, deploy path `/docs-*/`) over a deterministic corpus (`@otw/docs-data`, 120 pages by default, tunable via `OTW_DOCS_SIZE`). kudzu, astro, and eleventy use **Pagefind**; docusaurus uses `@easyops-cn/docusaurus-search-local`; vitepress uses its built-in local search (minisearch).

```bash
pnpm run build:docs
pnpm run docs:bench     # doc arrival + first search result + index transfer
```

### Results (median of 3, 4x CPU · Slow 4G, query "hydration")

| Variant | Doc contentReady | Initial JS | First search result | Search transfer |
| --- | ---: | ---: | ---: | ---: |
| Kudzu + Pagefind | **250 ms** | 119.1 KB | **1,800 ms** | **44.7 KB** |
| Eleventy + Pagefind | 278 ms | 117.4 KB | **1,801 ms** | **44.7 KB** |
| Astro + Pagefind | 990 ms | 117.4 KB | **1,801 ms** | **44.7 KB** |
| Docusaurus + search-local | 1,220 ms | 719.6 KB | 6,803 ms | 190.7 KB |
| VitePress + local search | 2,202 ms | 165.4 KB | 2,566 ms | 402.4 KB |

The search architecture shows through directly. Pagefind only downloads the index shard a query actually needs, so all three variants pay exactly the same cost (44.7 KB, 1,800 ms) — regardless of framework, search is a property of Pagefind. Docusaurus's search-local ships the entire lunr index bundled into initial JS (a large share of that 719.6 KB), taking 6.8 s to the first result. VitePress downloads the whole minisearch index when search opens (402.4 KB — the index grows in proportion to corpus size).

<details>
<summary>Measurement detail</summary>

- Entry is a `/guide/routing/routing-01/` deep link. `contentReady` is navigationStart → `.doc-title` visible.
- "First search result" is search UI activation → typing → first result item rendered, retried every 50 ms if the control isn't wired up yet (same definition as commerce's actReady).
- The query "hydration" is in the corpus generator's TERMS, so a result is guaranteed to exist.
- Raw JSON: `bench/docs-<variant>.json`.
</details>

## Real-world defects & constraints found

Only things worth filing upstream against the framework itself — genuine upstream bugs or undocumented constraints — are kept here. Our own app configuration/history, or constraints the framework intends, are excluded.

1. **TanStack Start — SPA transition hangs forever on subpath deploys (real bug)**
   `@tanstack/start-static-server-functions` fetches the prerendered server-function cache from the origin root (`/__tsr/staticServerFnCache/...`) as an absolute path. Deployed to a `/<repo>/` subpath like GitHub Pages, that request 404s, the route gets stuck pending, and the client transition never completes (deep links are fine since they're prerendered HTML → not reproducible in local dev). This repo works around it by vendoring the middleware base-aware (`apps/tanstack-router/src/lib/staticFunctionMiddleware.ts`, prefixing `import.meta.env.BASE_URL`).
   **Rechecked 2026-08-08: still unfixed** (`1.167.24` — no base-handling strings anywhere in `dist/`). **Rechecked 2026-08-12 (`react-start 1.168.42` / `start-plugin-core 1.171.33`): half resolved.** The base-ignoring bug itself is gone — the offending `@tanstack/start-static-server-functions` package was removed and server-function calls were redesigned as RPC on a build-time define, `TSS_SERVER_FN_BASE = joinPaths(["/", routerBasepath, serverFnBase, "/"])`, so requests are base-prefixed (verified: a build without the workaround 404s on `/kudzu-based-bench/tanstack/_serverFn/<id>` — the base is correct). But the mechanism that fell back to prerendered static JSON went away with it, so on a serverless static host client transitions still break: live RPC 404 → `Invariant failed` (the symptom merely changed from infinite pending to an error). The vendored middleware is still required — no longer as a base workaround, but as the **static-cache capability itself**.
2. **Next.js App Router — `output: "export"` build fails when `generateStaticParams()` returns an empty array**
   Pages Router (`getStaticPaths` → `paths: []`, `fallback: false`) accepts an empty collection outright, but App Router kills a static-export build if a dynamic route can't produce at least one path. This repo defends against it with a sentinel path (`_none`) + `dynamicParams = false` + `notFound()` when the collection is empty (`apps/next-app/src/app/news/post/[id]/page.tsx`). A case of the same framework's two routers behaving differently in the same situation.
3. **VitePress — dynamic routes can't produce directory-style pretty URLs**
   `[page].md` dynamic routes always emit flat `<param>.html` files regardless of the `cleanUrls` setting (no `/news/list/1/index.html` form). Because GitHub Pages serves extensionless requests as `.html`, `cleanUrls: true` matches the URL contract of the other variants, but trailing-slash presence still differs. The docs fixture (`apps/docs-vitepress`) works around the same issue by having its gen script emit real `.md` files.
4. **Docusaurus — a custom plugin's `addRoute` paths must be baseUrl-prefixed**
   `<BrowserRouter>` mounts without a basename (core `clientEntry.js`), so the client matches against the full URL including baseUrl. If a plugin registers unprefixed paths (`/`, `/news/list/1`) via `addRoute`, SSG (which drives StaticRouter directly) works fine, but on hydration nothing matches, so it falls back to the catch-all `@theme/NotFound` → React #418. Registration must be prefixed with `normalizeUrl([baseUrl, path])` (same as the core content plugins and `useBaseUrl`).
5. **Docusaurus — SSG dies with `require.resolveWeak is not a function` when the app's package.json has `"type": "module"`**
   The build succeeds through Client/Server compilation and dies at the SSR bundle execution step. The server bundle (webpack CJS, whose route registry uses `require.resolveWeak`) gets loaded in an ESM context, so the webpack `require` shim is missing. Nothing in the error message hints that `type: "module"` is the cause (reproduced and confirmed in `apps/docs-docusaurus`). Removing that field from the app manifest is the workaround.
6. **React Router v8 — `ssr: false` prerender nests output one level below the basename**
   The basename has to be the full deploy path for client-side routing to match the served URL, but the prerender plugin also applies that basename to the output path, so real pages land at `build/client/<basename>/<route>/index.html`. A generic SPA fallback shell takes the `build/client` root instead, so serving that directory as the document root gives you an empty home page. Worked around with a post-build hoist (`apps/shop-react-router/scripts/flatten-build.mjs`, same fix in `apps/form-react-router`).
7. **TanStack Start — static output lands in `dist/client`**
   The default multi-environment build splits into `dist/client` (static) and `dist/server` (an unused server bundle). Uploading it as-is to a static host is off by one directory. Pinned with `environments.client.build.outDir` (`apps/shop-tanstack/vite.config.ts`). As a bonus, the `dist/server` bundle bakes in the build machine's absolute paths.
8. **Kudzu 0.8.x — seven syntax boundaries hit while compiling commerce, form, and docs**
   All recorded as comments in `apps/shop-kudzu`, `apps/form-kudzu`, and `apps/docs-kudzu` source. In short: (a) package imports outside a JSX event handler are rejected outright, so build-time data has to be code-generated into a relative module; (b) `.map()` over an imported array is claimed by the keyed-list analysis even outside JSX and then rejected, so reshaping falls back to a `for` loop; (c) a row component can't take a whole-object prop, so rows are inlined as intrinsic markup; (d) a selector pipeline's (`filter`/`toSorted`) source can only be a literal-emitted relative import array; (e) `new CustomEvent` is rejected, so components can't notify each other of state changes; (f) a `navigation` group requires enumerating every member route up front, so it doesn't apply to a `getStaticPaths` catalog; (g) free identifiers inside handlers/effects are evaluated as build-time captures — a local helper function is rejected as "not serializable," and a DOM global reference like `instanceof HTMLElement` is rejected with a build-time `ReferenceError`. Handler bodies have to compile down to inline code plus attribute manipulation (`setAttribute`).

## Verification tools (local only)

- `pnpm run build:stats` — newsletter clean-build time/output size → refreshes the README tables.
- `pnpm run perf:bench` — Lighthouse desktop + routing-transition measurement → `bench/report.md`.
- `pnpm run origin:diff` / `pnpm run visual:diff` — pixel diff (vs. the live origin / across variants).
- `pnpm run test:e2e` — Playwright e2e (newsletter variants × 5 scenarios).
- `pnpm run shop:bench -- --variant shop-kudzu` — commerce session replay → `bench/<variant>.json`.
- `pnpm run shop:assets` / `pnpm run shop:scale -- --sizes 100,1000,10000` — per-route JS · scale build.
- `pnpm run form:bench -- --variant form-kudzu` — form wizard → `bench/form-<variant>.json`.
- `pnpm run docs:bench -- --variant docs-kudzu` — docs search → `bench/docs-<variant>.json`.
- `pnpm run shop:report` — merges commerce measurements into `landing/commerce.json`.

## Development

Node.js is required (fnm recommended, see `.nvmrc`). The Hugo binary is fetched automatically by `hugo-bin` on install.

```bash
corepack enable   # if pnpm is missing
pnpm install
pnpm dev          # apps/web
```

`pnpm build:variants` builds the newsletter's nine other variants, `pnpm build:all` builds all ten, and `build:shop`/`build:form`/`build:docs` each build their fixture.

## Deploy

The CI deploy workflow was removed — deploys run locally.

```bash
pnpm run deploy:pages              # prefetch → build:all → assemble site/ → push gh-pages
pnpm run deploy:pages -- --skip-build  # assemble & push from already-built output only
```

`scripts/deploy-pages.mjs` builds every variant, assembles `site/` with the `assembleSite()` layout, then force-pushes an orphan commit to `gh-pages`. The commerce, form, and docs fixtures are included automatically if already built, and skipped otherwise.

## Content

Content loading needs the `NOTION_TOKEN` and `NOTION_DATABASE_ID` environment variables (local `.env`). Without them the build still succeeds cleanly, producing an empty collection. For direct content contributions, please reach out to [SimYunSup](https://github.com/SimYunSup) or open an issue!

## License

MIT License
