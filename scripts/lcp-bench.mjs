#!/usr/bin/env node
/**
 * LCP benchmark — the metric people ask for, measured honestly.
 *
 * "Did you measure LCP?" is the first question this repo gets, and the
 * honest answer needs numbers, not an argument. This harness reports LCP
 * the way the browser defines it (PerformanceObserver, final candidate
 * before any input) for the three deterministic fixtures, next to the
 * element the browser actually picked and the bytes that element cost.
 *
 * What it exists to show:
 *   - Commerce LCP is a product photograph, and that PNG is byte-identical
 *     across all five variants (md5 9af3706…, 22 KB). So the LCP column
 *     ranks image decode, not rendering architecture — a variant that is
 *     an order of magnitude slower to become interactive can score the
 *     same LCP.
 *   - Docs LCP is text, and there the spread is real: a variant that
 *     re-renders its article body after hydration pushes its own LCP out.
 *
 * What the reported figure is, exactly (measured, not suspected):
 *   - On the commerce home and search routes the viewport holds several
 *     equally sized 21 KB tiles, and LCP only advances for a *larger*
 *     element, so the figure is "when the first tile arrived" and the
 *     element behind it is whichever tile won that load's race. The winner
 *     changes between loads (see `lcpSampleElements`); the timing does not,
 *     because the link hands its bytes out in a fixed order. Do not read
 *     the `lcpUrl` of a listing row as "the variant's hero".
 *   - The paint follows the download, not the main thread: in every run of
 *     the CDP trace the LCP entry lands within ~10 ms of the winning
 *     image's `Network.loadingFinished`, and no long task appears before
 *     it. On these fixtures LCP measures bandwidth contention — a variant
 *     that spends 328 KB of the 200 KB/s link on its own bundle before the
 *     first tile finishes cannot paint sooner, whatever its rendering
 *     architecture.
 *   - Spread is published, not assumed away: every row carries n, min–max
 *     and CV, computed from `lcpSamples`. A row whose CV is in the double
 *     digits is a row whose median should not be quoted alone — that is
 *     how the token-handout defect below was found in the first place.
 *
 * Deliberately NOT measured:
 *   - The newsletter fixture. Its largest element is a Notion image and
 *     every variant runs a different image pipeline (sharp / unoptimized /
 *     raw copy), so LCP there compares image tooling, not frameworks. Its
 *     Lighthouse LCP already exists via `pnpm run perf:bench`.
 *   - Anything after the first input. LCP is frozen by the first click,
 *     keypress or scroll, so this harness never interacts with the page.
 *     Interaction cost is shop-bench.mjs's job (actReady/stepLatency).
 *
 * Serving and throttling reproduce scripts/shop-bench.mjs's conventions
 * (deploy base under BASE_PATH/<variant>, Chrome's own Slow 4G preset,
 * in-page timing) without importing from it — that file is a script with
 * no exports, not a module.
 *
 * Usage:
 *   node scripts/lcp-bench.mjs                                  # 15 variants
 *   node scripts/lcp-bench.mjs --fixture shop
 *   node scripts/lcp-bench.mjs --fixture docs --variant docs-vitepress
 *   node scripts/lcp-bench.mjs --runs 7 --cpu 6 --net fast4g
 *   node scripts/lcp-bench.mjs --no-throttle --skip-readme
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const BASE_PATH = "/kudzu-based-bench";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm"
};

/** Chrome's own "Slow 4G" preset, so numbers line up with DevTools traces. */
const NETWORK = {
  slow4g: { latency: 150, download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8 },
  fast4g: { latency: 40, download: (9 * 1024 * 1024) / 8, upload: (1.5 * 1024 * 1024) / 8 }
};

/** Each framework names its static output differently; probe the known ones. */
const DIST_CANDIDATES = [
  "dist",
  "out",
  path.join("build", "client"),
  "build",
  "_site",
  path.join(".vitepress", "dist")
];

const FIXTURES = {
  shop: {
    label: { ko: "커머스", en: "Commerce" },
    variants: ["shop-kudzu", "shop-astro", "shop-react-router", "shop-tanstack", "shop-next-app"],
    // Three routes, because the LCP element differs by route: the home and
    // listing grids paint a tile photo, the detail page paints the hero.
    routes: async () => [
      { key: "home", label: { ko: "홈", en: "Home" }, path: "/" },
      { key: "search", label: { ko: "검색 리스팅", en: "Search listing" }, path: "/search/" },
      { key: "product", label: { ko: "상품 상세", en: "Product detail" }, path: "/product/p-00000/" }
    ]
  },
  docs: {
    label: { ko: "문서", en: "Docs" },
    variants: ["docs-kudzu", "docs-astro", "docs-eleventy", "docs-docusaurus", "docs-vitepress"],
    // Same deep link docs-bench.mjs uses: second page of the "routing"
    // section. Imported lazily so `--fixture shop` does not require the
    // docs corpus to be built.
    routes: async () => {
      const { getDocs } = await import("../packages/docs-data/dist/index.js");
      const pages = getDocs().pages.filter(page => page.section === "routing");
      const target = pages[1];
      if (!target) throw new Error("docs-data corpus has fewer than 2 pages in the 'routing' section");
      return [{ key: "doc", label: { ko: "문서 딥링크", en: "Doc deep link" }, path: `/guide/${target.section}/${target.slug}/` }];
    }
  },
  form: {
    label: { ko: "폼 위저드", en: "Form wizard" },
    variants: ["form-kudzu", "form-astro", "form-react-router", "form-tanstack", "form-next-app"],
    routes: async () => [{ key: "step1", label: { ko: "1단계", en: "Step 1" }, path: "/" }]
  }
};

/** Display label: the framework, not the fixture prefix. */
const LABELS = {
  kudzu: "Kudzu",
  astro: "Astro",
  "react-router": "React Router",
  tanstack: "TanStack",
  "next-app": "Next.js",
  eleventy: "Eleventy",
  docusaurus: "Docusaurus",
  vitepress: "VitePress"
};
const labelFor = variant => LABELS[variant.replace(/^(shop|docs|form)-/, "")] ?? variant;

function parseArgs(argv) {
  const options = { fixture: null, variant: null, routes: null, runs: 5, cpu: 4, net: "slow4g", throttle: true, readme: true, readmeOnly: false };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--fixture") options.fixture = argv[++index];
    else if (flag === "--variant") options.variant = argv[++index];
    // `--routes product` exists for the heavy-photograph condition: a grid of
    // 1.4 MB tiles takes over a minute per load on Slow 4G, and a store would
    // never ship full-size photos into a listing grid anyway. The hero on the
    // detail page is where a real LCP photograph lives.
    else if (flag === "--routes") options.routes = argv[++index].split(",");
    else if (flag === "--runs") options.runs = Number(argv[++index]);
    else if (flag === "--cpu") options.cpu = Number(argv[++index]);
    else if (flag === "--net") options.net = argv[++index];
    else if (flag === "--no-throttle") options.throttle = false;
    else if (flag === "--skip-readme") options.readme = false;
    // Re-render the README table from landing/lcp.json without measuring —
    // the table format changes more often than the measurements do, and a
    // full run is seven minutes.
    else if (flag === "--readme-only") options.readmeOnly = true;
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!NETWORK[options.net]) throw new Error(`--net must be one of ${Object.keys(NETWORK).join(", ")}`);
  if (options.fixture && !FIXTURES[options.fixture]) {
    throw new Error(`--fixture must be one of ${Object.keys(FIXTURES).join(", ")}`);
  }
  return options;
}

/**
 * Bandwidth model, in the server rather than in CDP.
 *
 * This is the one place this harness deliberately departs from its sibling
 * benches, and the reason is a measured defect in the tooling, not taste.
 * While `Network.emulateNetworkConditions` is active, this Chromium reports
 * no image LCP candidate at all — not "a late one is missed": an image that
 * finishes in 20 ms under an effectively unlimited emulated link is dropped
 * just the same, and the only candidate ever emitted is the product title.
 * Disable emulation, or produce the same delay in the server, and `IMG` is
 * reported normally. Measured on Chromium 151, headless_shell and
 * `channel: "chromium"` alike:
 *
 *   no emulation                        image at    8 ms -> IMG candidate
 *   CPU 4x only, no emulation           image at   15 ms -> IMG candidate
 *   CDP emulation, 50 Mbps / 0 ms       image at   20 ms -> title only
 *   CDP emulation, Slow 4G              image at  529 ms -> title only
 *   CDP emulation, Slow 4G + CPU 4x     image at 7542 ms -> title only
 *   server-side 3 s delay               image at 3014 ms -> IMG candidate
 *   server-paced Slow 4G (this harness) image at 7166 ms -> IMG candidate
 *
 * A storefront's LCP element is a photograph, so a harness that cannot see
 * image candidates measures nothing here. The network is therefore modelled
 * in the server: one shared token bucket for the whole page load (bandwidth
 * is shared in reality, so per-response pacing would overstate throughput by
 * the number of parallel requests) plus a fixed first-byte delay per
 * request. CPU throttling stays on CDP, where it is well behaved.
 *
 * Consequence for the numbers: absolute LCP here is not comparable with the
 * sibling benches' CDP-throttled figures. Bytes-over-link dominates, and it
 * lands where the arithmetic says — the photo finishes at
 * bytesBeforeLcp / 204.6 KB/s (measured) against a 200 KB/s budget.
 *
 * How the tokens are handed out is not a detail. The first version let every
 * in-flight response poll the bucket on its own timer, so whichever chunk
 * loop happened to wake while tokens were banked took the pipe — a lottery
 * run by timer jitter rather than a bandwidth share. It set the noise floor
 * of the whole bench: on the commerce home route, where nine equally sized
 * tiles and a client bundle are in flight together, React Router's LCP
 * ranged 716–1900 ms across loads (CV ≈ 40%) purely on who won that
 * lottery, and the published median swung 732 -> 1680 ms between two
 * sessions of the same build. Handing tokens out in strict arrival order
 * instead — one scheduler, one queue, next chunk enqueued only after the
 * previous one is written, which is what a serial link does — put the same
 * row at 1320–1552 ms (CV ≈ 5%) with no change to the fixtures, the
 * throttling profile, or the aggregate rate.
 */
function createBucket(bytesPerSecond) {
  // Starts empty, and never banks more than a 64 KB burst. Seeding it with a
  // full second of tokens handed the first ~200 KB out for free, which showed
  // up as an effective 227 KB/s against a 200 KB/s budget — a 13% error on
  // every LCP figure, and the largest error in the model.
  const CEILING = 64 * 1024;
  let available = 0;
  let last = Date.now();
  const queue = [];
  let draining = false;

  const refill = () => {
    const now = Date.now();
    available = Math.min(CEILING, available + ((now - last) / 1000) * bytesPerSecond);
    last = now;
  };

  // One drain loop for the whole server: the head of the queue owns the link
  // until its chunk is paid for, so concurrent transfers interleave in the
  // order they asked rather than in the order their timers fired.
  const drain = async () => {
    if (draining) return;
    draining = true;
    while (queue.length) {
      refill();
      const head = queue[0];
      if (available >= head.bytes) {
        available -= head.bytes;
        queue.shift();
        head.resolve();
        continue;
      }
      const deficit = head.bytes - available;
      await new Promise(resolve => setTimeout(resolve, Math.max(1, (deficit / bytesPerSecond) * 1000)));
    }
    draining = false;
  };

  return function take(bytes) {
    return new Promise(resolve => {
      queue.push({ bytes, resolve });
      drain();
    });
  };
}

/**
 * Serve one variant's build output under its deploy base, the same way
 * scripts/shop-bench.mjs does — identical headers for every variant, and no
 * caching decisions of our own.
 */
function startServer(distDir, variant, options) {
  const prefix = `${BASE_PATH}/${variant}`;
  const profile = NETWORK[options.net];
  const take = options.throttle ? createBucket(profile.download) : null;
  // One MTU per token grant, not 16 KB. The chunk size is the link's
  // quantisation step, and a coarse one lets a single response grab a burst
  // and cross the line before responses it is supposed to be sharing with:
  // measured on the commerce home route, where six equally sized tiles are in
  // flight, Kudzu's LCP came out in ~80 ms steps (508 · 548 · 612 · 688 ms,
  // CV 12%) and 80 ms is exactly 16 KB at 200 KB/s. Per-run medians for that
  // row, everything else held:
  //
  //   16384 B   508–688 ms   CV 12%     (bursty: a tile can finish at 508)
  //    4096 B   508–792 ms   CV 17%     (half-quantised, worst of both)
  //    1460 B   716–792 ms   CV  4%     (all six advance together)
  //
  // The tight figure is also the honest one: six transfers sharing 200 KB/s
  // cannot deliver 126 KB before ~630 ms, so the 508 ms samples were the
  // model's artefact, not the fixture's speed. React Router's home route
  // lands at 1256–1376 ms (CV 3%) under the same change.
  const CHUNK = 1460;

  const server = createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (!pathname.startsWith(prefix)) {
      response.writeHead(404).end();
      return;
    }
    let file = path.join(distDir, pathname.slice(prefix.length).replace(/^\/+/, ""));
    if (!file.startsWith(distDir)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!existsSync(file)) {
      // cleanUrls output (VitePress): pages are flat `<slug>.html` files with
      // no directory form, so `/guide/x/y/` and `/guide/x/y` both resolve to
      // `guide/x/y.html` — the same lenient mapping GitHub Pages applies, and
      // the same fallback scripts/docs-bench.mjs needs for that variant.
      const flat = `${file.replace(/[\\/]+(index\.html)?$/, "")}.html`;
      if (existsSync(flat)) {
        file = flat;
      } else {
        response.writeHead(404).end();
        return;
      }
    }

    // Round-trip time, once per request, before the first byte.
    if (take) await new Promise(resolve => setTimeout(resolve, profile.latency));
    response.writeHead(200, {
      "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "public, max-age=3600"
    });
    if (!take) {
      createReadStream(file).pipe(response);
      return;
    }
    for await (const chunk of createReadStream(file, { highWaterMark: CHUNK })) {
      await take(chunk.length);
      if (!response.write(chunk)) await new Promise(resolve => response.once("drain", resolve));
    }
    response.end();
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

/** CPU throttling only; the network is modelled by startServer's bucket. */
async function applyThrottling(page, options) {
  if (!options.throttle) return;
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: options.cpu });
}

/**
 * LCP, by the browser's own definition: every candidate is collected with
 * `buffered: true` (so nothing that fired before the probe was installed is
 * lost) and the *last* one wins. Waiting past the load event matters — a
 * variant that re-renders its content during hydration emits a later
 * candidate, and truncating at `load` would hide exactly that.
 *
 * Escaping note: this string is embedded in a template literal, so the
 * regex must be written `\\s` (a bare `\s` would be eaten to `s`).
 */
const LCP_PROBE = `(settleMs, budgetMs) => new Promise(resolve => {
  const describe = element => {
    if (!element) return null;
    const tag = element.tagName.toLowerCase();
    const className = typeof element.className === "string" ? element.className.trim() : "";
    const classes = className ? "." + className.split(/\\s+/).slice(0, 2).join(".") : "";
    return tag + classes;
  };

  let lastCandidateAt = performance.now();
  const candidates = [];
  const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      candidates.push({
        ms: +entry.startTime.toFixed(1),
        size: entry.size,
        url: entry.url || null,
        element: describe(entry.element),
        text: entry.url ? null : (entry.element ? (entry.element.textContent || "").trim().slice(0, 48) : null)
      });
      lastCandidateAt = performance.now();
    }
  });
  observer.observe({ type: "largest-contentful-paint", buffered: true });

  // The settle window has to be anchored on the load event as well as on the
  // last candidate, because the two events that matter arrive in the wrong
  // order for a hero image: the h1 becomes a candidate in the first frame,
  // the photograph finishes downloading seconds later, and its paint needs
  // one more presented frame before the observer fires. Anchoring on the last
  // candidate alone made "readyState complete" instantly satisfy a 1.5 s
  // quiet window that had already elapsed since the h1 — the probe closed
  // 80 ms after a 1.4 MB image landed and reported the title as LCP.
  let loadAt = document.readyState === "complete" ? performance.now() : null;
  if (loadAt === null) addEventListener("load", () => { loadAt = performance.now(); }, { once: true });

  const finish = () => {
    observer.disconnect();
    const paint = performance.getEntriesByName("first-contentful-paint")[0];
    const navigation = performance.getEntriesByType("navigation")[0];
    const last = candidates.length ? candidates[candidates.length - 1] : null;
    const resource = last && last.url ? performance.getEntriesByName(new URL(last.url, location.href).href)[0] : null;

    // Everything that finished downloading before the LCP element did. On a
    // bandwidth-limited connection these bytes are the LCP element's
    // competition, so publishing them turns "the photo queues behind the
    // bundles" from a story into a number that can be checked per variant.
    const lcpAt = last ? last.ms : Infinity;
    const before = performance
      .getEntriesByType("resource")
      .filter(entry => entry.responseEnd > 0 && entry.responseEnd <= lcpAt);
    const sum = entries => entries.reduce((total, entry) => total + (entry.encodedBodySize || entry.transferSize || 0), 0);

    resolve({
      fcpMs: paint ? +paint.startTime.toFixed(1) : null,
      loadEventMs: navigation && navigation.loadEventEnd ? +navigation.loadEventEnd.toFixed(1) : null,
      candidates,
      lcp: last,
      // Same-origin resources, so encodedBodySize is populated without a
      // Timing-Allow-Origin dance.
      lcpBytes: resource ? resource.encodedBodySize || resource.transferSize || null : null,
      bytesBeforeLcp: sum(before),
      scriptBytesBeforeLcp: sum(before.filter(entry => entry.initiatorType === "script" || /\\.m?js(\\?|$)/.test(entry.name)))
    });
  };

  // Settling also requires an actual candidate. A client-rendered variant
  // reaches readyState "complete" long before it paints anything — VitePress
  // renders its article around 2.3 s under 4x CPU / Slow 4G, well after its
  // load event — so a window that closed on "complete + quiet" alone would
  // report zero candidates for exactly the variants whose rendering is
  // slowest.
  //
  // It also has to wait out images that are still arriving. Lazy images do not
  // block the load event, and the commerce hero is lazy in every variant: on
  // the heavy condition \`load\` fired around 1 s while the 1.4 MB photograph
  // still had six seconds of link time to go, the quiet window elapsed, and
  // the probe published the product title at 352 ms as that variant's LCP
  // (one sample in three, which is exactly how it hid). Any image that has
  // started fetching and not finished can still take the candidacy, so the
  // window stays open while one exists.
  const imagesPending = () =>
    Array.prototype.some.call(document.images, image => image.currentSrc && !image.complete);
  const tick = () => {
    const anchor = Math.max(lastCandidateAt, loadAt ?? 0);
    const settled =
      candidates.length > 0 && loadAt !== null && !imagesPending() && performance.now() - anchor >= settleMs;
    if (settled || performance.now() >= budgetMs) return finish();
    setTimeout(tick, 100);
  };
  tick();
})`;

/**
 * One load in a fresh context. No interaction of any kind: the first click,
 * keypress or scroll freezes LCP, so an interacting harness would report
 * whatever it happened to interrupt.
 */
async function runLoad(browser, origin, variant, route, options) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await applyThrottling(page, options);
  try {
    await page.goto(`${origin}${BASE_PATH}/${variant}${route.path}`, { waitUntil: "commit" });
    const sample = await page.evaluate(`(${LCP_PROBE})(1500, 30000)`);
    if (!sample.lcp) throw new Error(`${variant} ${route.path}: no LCP candidate within 30000 ms`);
    if (sample.fcpMs === null) throw new Error(`${variant} ${route.path}: no first-contentful-paint entry`);
    return sample;
  } finally {
    await context.close();
  }
}

const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};

/**
 * Per-run spread of a published figure, derived from `lcpSamples` at render
 * time rather than stored: rows measured before this existed still get one,
 * and a re-render can never disagree with the samples it was computed from.
 *
 * `cvPct` is the honest health indicator for this bench. A commerce listing
 * row sits near 40% because its LCP element is whichever of nine equal-sized
 * tiles won that load's download race (measured: React Router's home route
 * ranges 0.7–2.0 s while Kudzu's holds 0.50–0.54 s), and a spread that comes
 * from the fixture's structure does not shrink with more runs — at CV 40% it
 * takes ~45 loads to pin the mean inside ±10%.
 */
const spreadOf = samples => {
  const mean = samples.reduce((total, value) => total + value, 0) / samples.length;
  const variance =
    samples.length > 1
      ? samples.reduce((total, value) => total + (value - mean) ** 2, 0) / (samples.length - 1)
      : 0;
  return {
    n: samples.length,
    min: Math.min(...samples),
    max: Math.max(...samples),
    cvPct: mean ? +((Math.sqrt(variance) / mean) * 100).toFixed(0) : 0
  };
};

/**
 * Image weight condition of the build being served, read off the artifact
 * rather than off an env var: a heavy build measured in a shell without
 * OTW_IMAGE_WEIGHT set would otherwise be labelled "light" and quietly
 * corrupt the comparison. The threshold sits an order of magnitude above the
 * light tiles (~21 KB) and below the heavy ones (~1.4 MB).
 */
const HEAVY_TILE_FLOOR = 200 * 1024;

async function benchVariant(browser, fixtureKey, fixture, variant, routes, options) {
  const distDir = DIST_CANDIDATES.map(name => path.join(repoRoot, "apps", variant, name)).find(existsSync);
  if (!distDir) throw new Error(`no build output under apps/${variant} — build the variant first`);

  const tile = path.join(distDir, "commerce", "p-00.png");
  const heroBytes = existsSync(tile) ? statSync(tile).size : null;
  const imageWeight = heroBytes === null ? "none" : heroBytes >= HEAVY_TILE_FLOOR ? "heavy" : "light";

  const { server, port } = await startServer(distDir, variant, options);
  const origin = `http://127.0.0.1:${port}`;
  const rows = [];
  try {
    for (const route of routes) {
      // One discarded warm-up: the first load of a variant pays for page
      // compilation and disk cache warming that no repeat load pays.
      await runLoad(browser, origin, variant, route, options);

      const samples = [];
      for (let run = 0; run < options.runs; run++) samples.push(await runLoad(browser, origin, variant, route, options));

      const lcpMs = +median(samples.map(sample => sample.lcp.ms)).toFixed(1);
      // Element and resource fields come from the run that produced the
      // published median, not from the last run. On a listing grid the LCP
      // element is whichever tile won that load's download race, so "the last
      // run's element" regularly described a different image than the number
      // printed next to it.
      const representative = samples.reduce((best, sample) =>
        Math.abs(sample.lcp.ms - lcpMs) < Math.abs(best.lcp.ms - lcpMs) ? sample : best
      );
      const row = {
        fixture: fixtureKey,
        fixtureLabel: fixture.label,
        variant,
        label: labelFor(variant),
        route: route.key,
        routeLabel: route.label,
        path: route.path,
        imageWeight,
        heroImageBytes: heroBytes,
        // Per-row, because a single-variant re-run merges into the published
        // file: one global timestamp would date rows it never touched.
        measuredAt: new Date().toISOString(),
        fcpMs: +median(samples.map(sample => sample.fcpMs)).toFixed(1),
        lcpMs,
        lcpSamples: samples.map(sample => sample.lcp.ms),
        // What won each run. A row whose samples straddle 0.7 s and 2.0 s is
        // not noisy instrumentation: it is a different tile finishing first
        // each time, and that is only visible if the winner is recorded.
        lcpSampleElements: samples.map(
          sample => `${sample.lcp.element}${sample.lcp.url ? ` ${sample.lcp.url.split("/").pop()}` : ""}`
        ),
        lcpDeltaFcpMs: +median(samples.map(sample => sample.lcp.ms - sample.fcpMs)).toFixed(1),
        lcpKind: representative.lcp.url ? "image" : "text",
        lcpElement: representative.lcp.element,
        lcpUrl: representative.lcp.url,
        lcpBytes: representative.lcpBytes,
        lcpCandidates: median(samples.map(sample => sample.candidates.length)),
        lcpFirstCandidateMs: +median(samples.map(sample => sample.candidates[0].ms)).toFixed(1),
        // The LCP element's competition for bandwidth: bytes that finished
        // downloading before it did.
        bytesBeforeLcp: Math.round(median(samples.map(sample => sample.bytesBeforeLcp))),
        scriptBytesBeforeLcp: Math.round(median(samples.map(sample => sample.scriptBytesBeforeLcp)))
      };
      rows.push(row);
      const spread = spreadOf(row.lcpSamples);
      console.log(
        `  ${row.route.padEnd(8)} FCP ${String(row.fcpMs).padStart(8)} ms   LCP ${String(row.lcpMs).padStart(8)} ms   ` +
          `${spread.n}회 ${Math.round(spread.min)}–${Math.round(spread.max)} ms (CV ${spread.cvPct}%)   ` +
          `${row.lcpKind} ${row.lcpElement}${row.lcpBytes ? ` (${(row.lcpBytes / 1024).toFixed(1)} KB)` : ""}` +
          `   LCP 전 ${(row.bytesBeforeLcp / 1024).toFixed(1)} KB(스크립트 ${(row.scriptBytesBeforeLcp / 1024).toFixed(1)} KB)`
      );
    }
  } finally {
    server.close();
  }
  return rows;
}

const START_MARKER = "<!-- lcp:start -->";
const END_MARKER = "<!-- lcp:end -->";

const WEIGHT_LABEL = {
  ko: { light: "21 KB 타일", heavy: "1.4 MB 사진", none: "—" },
  en: { light: "21 KB tile", heavy: "1.4 MB photo", none: "—" }
};

const L = {
  ko: {
    header: "| 픽스처 | 라우트 | 이미지 | 변형 | FCP | LCP | 회차 · 범위 | LCP−FCP | LCP 요소 | LCP 자원 |",
    element: row => (row.lcpKind === "image" ? `이미지 \`${row.lcpElement}\`` : `텍스트 \`${row.lcpElement}\``),
    bytes: row => (row.lcpBytes === null ? "—" : `${(row.lcpBytes / 1024).toFixed(1)} KB`),
    spread: spread => `${spread.n}회 · ${Math.round(spread.min)}–${Math.round(spread.max)} ms · CV ${spread.cvPct}%`,
    footnote: report =>
      `_\`pnpm run lcp:bench\`로 로컬 측정(수동 갱신). 각 행은 워밍업 1회를 버린 뒤 "회차 · 범위" 열의 회차만큼 재서 얻은 중앙값이며, 회차별 원본값은 \`landing/lcp.json\`의 \`lcpSamples\`, 회차별로 브라우저가 고른 요소는 \`lcpSampleElements\`에 있습니다. ` +
      `**범위와 CV를 중앙값과 함께 읽으십시오.** 커머스 홈·검색 라우트는 뷰포트에 같은 크기의 21 KB 타일이 여러 장 깔려 있어 LCP가 "가장 먼저 도착한 타일"이고, 그 승자는 회차마다 바뀝니다(\`lcpSampleElements\`). 2026-08-19까지 이 표가 세션마다 흔들린 원인은 픽스처가 아니라 하네스였습니다 — 토큰 버킷을 응답별로 폴링해서 대역폭이 "먼저 깨어난 응답"에게 갔고(React Router 홈 716–1900 ms, CV 40%, 공개 중앙값이 두 세션 사이 732 → 1680 ms), 청크가 16 KB여서 링크가 버스트로 흘렀고(Kudzu 홈이 16 KB=80 ms 계단으로 508·548·612·688 ms), 프로브가 \`load\`에서 창을 닫아 lazy 히어로를 놓쳤습니다(heavy 조건에서 3회 중 1회가 제목 352 ms로 발행). 도착 순서 단일 큐 + MTU(1460 B) 페이싱 + "받는 중인 이미지가 있으면 창을 열어 둔다"로 고친 뒤 같은 React Router 행이 1252–1368 ms(CV 4%)입니다. 지금 남은 두 자릿수 CV 행(Kudzu 커머스 홈·검색)은 브라우저의 요청 순서가 회차마다 뒤집혀서이며, 그래서 15회로 잽니다. ` +
      `LCP−FCP가 큰 행은 대역폭 경쟁을 읽는 자리입니다: 첫 타일이 도착하기 전에 자기 클라이언트 번들로 200 KB/s를 먼저 써버린 변형일수록 그만큼 늦게 그립니다(\`bytesBeforeLcp\`·\`scriptBytesBeforeLcp\` 참고). CPU가 아니라 링크가 병목이라, CDP 트레이스에서 LCP 항목은 매 회 승자 이미지의 \`Network.loadingFinished\` 뒤 ~10 ms에 붙고 그 앞에 롱태스크는 없습니다. ` +
      `브라우저 정의 그대로 \`PerformanceObserver('largest-contentful-paint')\`의 **마지막 후보**를 씁니다 — 하이드레이션이 본문을 다시 그려 후보가 뒤로 밀리면 그 값이 잡힙니다. "LCP 요소"·"LCP 자원" 열은 중앙값을 만든 회차의 것입니다(마지막 회차가 아니라). ` +
      `하네스는 페이지를 클릭·스크롤하지 않습니다(첫 입력이 LCP를 확정시키므로). ` +
      `"이미지" 열은 커머스 픽스처의 이미지 무게 조건입니다(\`OTW_IMAGE_WEIGHT\`) — 기본은 21 KB 타일, \`heavy\`는 1.4 MB 사진이고 두 조건 모두 다섯 변형이 md5까지 동일한 파일을 씁니다. 문서·폼 픽스처에는 이미지가 없습니다. ` +
      `대역폭은 CDP가 아니라 서버에서 모델링합니다(\`Network.emulateNetworkConditions\`를 켜면 이 크로미움이 늦게 도착한 이미지를 LCP 후보로 보고하지 않습니다 — \`scripts/lcp-bench.mjs\` 주석에 측정표가 있습니다). ` +
      `${report.throttling === "none" ? "무스로틀" : `${report.throttling.cpu} CPU · ${report.throttling.network}`} · 1280×900. ` +
      `측정 머신: ${report.machine.ko}. 측정 시각: ${report.measuredAt}_`
  },
  en: {
    header: "| Fixture | Route | Image | Variant | FCP | LCP | Runs · range | LCP−FCP | LCP element | LCP resource |",
    element: row => (row.lcpKind === "image" ? `image \`${row.lcpElement}\`` : `text \`${row.lcpElement}\``),
    bytes: row => (row.lcpBytes === null ? "—" : `${(row.lcpBytes / 1024).toFixed(1)} KB`),
    spread: spread => `${spread.n} · ${Math.round(spread.min)}–${Math.round(spread.max)} ms · CV ${spread.cvPct}%`,
    footnote: report =>
      `_Measured locally via \`pnpm run lcp:bench\` (manual refresh). Each row is the median of the loads counted in its "Runs · range" cell after one discarded warm-up; per-run values are in \`lcpSamples\` and the element the browser picked on each run is in \`lcpSampleElements\`, both in \`landing/lcp.json\`. ` +
      `**Read the range and CV together with the median.** On the commerce home and search routes the viewport holds several equally sized 21 KB tiles, so LCP is "the first tile that arrived" and the element behind it is whichever tile won that load (\`lcpSampleElements\`). What made this table move between sessions until 2026-08-19 was the harness, not the fixture: the token bucket was polled per response, so bandwidth went to whichever response woke first (React Router's home route 716–1900 ms, CV 40%, its published median flipping 732 -> 1680 ms between two sessions); the 16 KB chunk let the link run in bursts (Kudzu's home route stepped in 16 KB = 80 ms stairs: 508, 548, 612, 688 ms); and the probe closed its window at \`load\`, missing the lazy hero (on the heavy condition one load in three published the title at 352 ms). With arrival-order queueing, MTU-sized (1460 B) pacing and a window that stays open while an image is still arriving, that same React Router row measures 1252–1368 ms (CV 4%). The double-digit CV rows that remain — Kudzu's commerce home and search — come from Chrome flipping its request order per load, which is why they are measured at 15 loads. ` +
      `A large LCP−FCP is where bandwidth contention shows: a variant that spends the 200 KB/s link on its own client bundle before the first tile finishes paints exactly that much later (see \`bytesBeforeLcp\` and \`scriptBytesBeforeLcp\`). The link, not the CPU, is the bottleneck here — on the CDP trace the LCP entry lands ~10 ms after the winning image's \`Network.loadingFinished\` in every run, with no long task before it. ` +
      `Uses the browser's own definition — the **final** \`PerformanceObserver('largest-contentful-paint')\` candidate, so a hydration re-render that pushes the candidate later shows up here. The "LCP element" and "LCP resource" columns come from the run that produced the published median, not from the last run. ` +
      `The harness never clicks or scrolls (the first input freezes LCP). ` +
      `The "Image" column is the commerce fixture's image-weight condition (\`OTW_IMAGE_WEIGHT\`): the default is a 21 KB tile, \`heavy\` is a 1.4 MB photograph, and in both conditions all five variants serve a file identical down to its md5. The docs and form fixtures have no images. ` +
      `Bandwidth is modelled in the server rather than through CDP (with \`Network.emulateNetworkConditions\` on, this Chromium never reports a late-arriving image as an LCP candidate — the measurement table is in \`scripts/lcp-bench.mjs\`). ` +
      `${report.throttling === "none" ? "No throttling" : `${report.throttling.cpu} CPU · ${report.throttling.network}`} · 1280×900. ` +
      `Machine: ${report.machine.en}. Measured at ${report.measuredAt}_`
  }
};
const DIVIDER = "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: |";

function renderTable(report, lang) {
  const t = L[lang];
  const order = { shop: 0, docs: 1, form: 2 };
  const weightOrder = { light: 0, none: 0, heavy: 1 };
  const sorted = [...report.rows].sort(
    (left, right) =>
      order[left.fixture] - order[right.fixture] ||
      weightOrder[left.imageWeight ?? "none"] - weightOrder[right.imageWeight ?? "none"] ||
      left.path.localeCompare(right.path) ||
      left.lcpMs - right.lcpMs
  );
  const rows = sorted.map(
    row =>
      `| ${row.fixtureLabel[lang]} | ${row.routeLabel[lang]} | ${WEIGHT_LABEL[lang][row.imageWeight ?? "none"]} | ` +
      `${row.label} | ${Math.round(row.fcpMs)} ms | ${Math.round(row.lcpMs)} ms | ${t.spread(spreadOf(row.lcpSamples))} | ` +
      `${Math.round(row.lcpDeltaFcpMs)} ms | ${t.element(row)} | ${t.bytes(row)} |`
  );
  return [t.header, DIVIDER, ...rows, "", t.footnote(report)].join("\n");
}

/** Same marker convention scripts/build-stats.mjs uses for its own table. */
async function injectReadmeTables(report) {
  for (const [file, lang] of [
    ["README.md", "ko"],
    ["README.en.md", "en"]
  ]) {
    const absPath = path.join(repoRoot, file);
    if (!existsSync(absPath)) {
      console.warn(`lcp-bench: ${file} not found, skipping`);
      continue;
    }
    const readme = await readFile(absPath, "utf8");
    const start = readme.indexOf(START_MARKER);
    const end = readme.indexOf(END_MARKER);
    if (start === -1 || end === -1) {
      console.warn(`lcp-bench: markers not found in ${file}, skipping`);
      continue;
    }
    await writeFile(
      absPath,
      `${readme.slice(0, start + START_MARKER.length)}\n${renderTable(report, lang)}\n${readme.slice(end)}`
    );
    console.log(`lcp-bench: ${file} updated`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.readmeOnly) {
    const publishedPath = path.join(repoRoot, "landing", "lcp.json");
    if (!existsSync(publishedPath)) throw new Error("landing/lcp.json is missing — run a measurement first");
    await injectReadmeTables(JSON.parse(readFileSync(publishedPath, "utf8")));
    return;
  }

  const fixtureKeys = options.fixture ? [options.fixture] : Object.keys(FIXTURES);
  const browser = await chromium.launch();
  const rows = [];
  const failures = [];

  try {
    for (const key of fixtureKeys) {
      const fixture = FIXTURES[key];
      const declared = await fixture.routes();
      const routes = options.routes ? declared.filter(route => options.routes.includes(route.key)) : declared;
      if (!routes.length) {
        throw new Error(`--routes matched nothing in fixture ${key} (has ${declared.map(route => route.key).join(", ")})`);
      }
      const variants = options.variant ? fixture.variants.filter(name => name === options.variant) : fixture.variants;
      for (const variant of variants) {
        console.log(`\n${variant}`);
        try {
          rows.push(...(await benchVariant(browser, key, fixture, variant, routes, options)));
        } catch (error) {
          failures.push({ variant, message: error.message });
          console.error(`  ${error.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  // Machine spec the numbers were measured on, in the same format
  // scripts/build-stats.mjs records for the newsletter table.
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model?.replace(/\s+/g, " ").trim() ?? "unknown CPU";
  const totalGiB = Math.round(os.totalmem() / 1024 ** 3);

  // Merge, don't clobber: re-measuring one variant after a fix must not drop
  // the two dozen rows this run never visited. A row is identified by
  // fixture + variant + route, and carries its own measuredAt.
  const publishedPath = path.join(repoRoot, "landing", "lcp.json");
  // The image-weight condition is part of a row's identity: the light and
  // heavy commerce measurements are two different experiments, not two
  // attempts at one.
  const key = row => `${row.fixture}/${row.variant}/${row.route}/${row.imageWeight ?? "none"}`;
  const measured = new Map(rows.map(row => [key(row), row]));
  const kept = existsSync(publishedPath)
    ? JSON.parse(readFileSync(publishedPath, "utf8")).rows.filter(row => !measured.has(key(row)))
    : [];
  const merged = [...kept, ...rows];

  const report = {
    measuredAt: merged.reduce((latest, row) => (row.measuredAt > latest ? row.measuredAt : latest), ""),
    // No global `runs`: rows merge across sessions, so a single count would
    // mislabel every row it did not measure — the heavy-photograph rows are
    // measured with `--runs 3` while the light ones use 5. Each row's count
    // is `lcpSamples.length`, and the table prints it per row.
    throttling: options.throttle ? { cpu: `${options.cpu}x`, network: `${options.net} (server-paced)` } : "none",
    machine: {
      ko: `${cpuModel} · ${cpus.length}코어 · RAM ${totalGiB} GB · ${process.platform}/${process.arch} · Node ${process.version}`,
      en: `${cpuModel} · ${cpus.length} cores · ${totalGiB} GB RAM · ${process.platform}/${process.arch} · Node ${process.version}`
    },
    rows: merged
  };
  mkdirSync(path.join(repoRoot, "landing"), { recursive: true });
  writeFileSync(publishedPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nwrote landing/lcp.json (${rows.length} measured, ${merged.length} total rows)`);
  if (options.readme) await injectReadmeTables(report);

  if (failures.length) {
    for (const failure of failures) console.error(`FAILED ${failure.variant}: ${failure.message}`);
    process.exitCode = 1;
  }
}

await main();
