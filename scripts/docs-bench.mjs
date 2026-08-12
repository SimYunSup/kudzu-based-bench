#!/usr/bin/env node
/**
 * Docs+search fixture benchmark — activation-to-search-result, not
 * Lighthouse cells.
 *
 * Reuses scripts/shop-bench.mjs's serving/throttling conventions (deploy
 * base under BASE_PATH/<variant>, Chrome's own "Slow 4G" + CPU throttle
 * preset, in-page performance.now() timing instead of external CDP
 * polling) without importing from or modifying that file — shop-bench.mjs
 * has no exports; it is a script, not a module.
 *
 * This harness answers two questions a docs site's owner actually has:
 *
 *   contentReadyMs   navigationStart -> a deep guide page's key text (the
 *                    <h1 class="doc-title">) is in the DOM. The entry point
 *                    is a page two levels into the "routing" section, not
 *                    the homepage — nobody lands on a docs homepage from a
 *                    search engine, they land on the page that answers
 *                    their query.
 *   initialJsBytes   total wire bytes (CDP encodedDataLength, which
 *                    reflects actual compressed transfer size and is not
 *                    zeroed by opaque/cross-origin responses the way
 *                    performance resource timing's transferSize can be)
 *                    for every script resource loaded between navigation
 *                    and the page's `load` event — the JS cost every
 *                    visitor pays whether or not they ever search.
 *   searchReadyMs    from the search UI's activation click to the first
 *                    result item appearing in the DOM, after typing the
 *                    query "하이드레이션" (one of @otw/docs-data's TERMS,
 *                    so every variant's index is guaranteed to have a
 *                    hit). Retries the activate+type sequence every 50 ms
 *                    so a UI that isn't wired up yet (search bundle still
 *                    loading) is timed rather than thrown away, the same
 *                    pattern shop-bench.mjs's INTERACT helper uses.
 *   searchBytes      wire bytes transferred strictly between "search
 *                    started" and "first result shown" — the index
 *                    chunk/query cost paid only by someone who actually
 *                    searches, isolated from the page's initial JS.
 *
 * ADAPTER SELECTORS — best-effort from each search package's own source,
 * not from a built fixture (none exists at the time this script was
 * written). Flagged inline with "실측 후 조정 필요" wherever a selector
 * could not be confirmed against real build output (CSS-module class
 * hashing in particular): re-check with devtools once each docs-* variant
 * builds and adjust ADAPTERS below.
 *
 * Usage:
 *   node scripts/docs-bench.mjs                       # all 5 variants
 *   node scripts/docs-bench.mjs --variant docs-kudzu
 *   node scripts/docs-bench.mjs --variant docs-kudzu --runs 5 --cpu 6 --net fast4g
 *   node scripts/docs-bench.mjs --no-throttle
 */
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { getDocs, TERMS } from "../packages/docs-data/dist/index.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const BASE_PATH = "/kudzu-based-bench";

const DOCS_VARIANTS = ["docs-kudzu", "docs-astro", "docs-eleventy", "docs-docusaurus", "docs-vitepress"];

// Each framework names its static output differently — probe in the same
// order shop-bench.mjs uses, plus VitePress's nested default location.
const DIST_CANDIDATES = ["dist", "build", "_site", path.join(".vitepress", "dist"), "out"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

/** Chrome's own "Slow 4G" preset, so numbers line up with DevTools traces. */
const NETWORK = {
  slow4g: { latency: 150, download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8 },
  fast4g: { latency: 40, download: (9 * 1024 * 1024) / 8, upload: (1.5 * 1024 * 1024) / 8 }
};

/**
 * Guaranteed to hit: TERMS is round-robined across every page in
 * @otw/docs-data, so at 120 pages every term appears as the primary or
 * secondary term of several pages regardless of which docs variant is
 * under test.
 */
const SEARCH_TERM = "하이드레이션";

/**
 * Search UI adapters. Every adapter clicks something (the "activation"
 * step), then types SEARCH_TERM into `input`, then polls `result` for a
 * non-empty first item.
 *
 * pagefind (docs-kudzu/astro/eleventy): official default UI
 * (@pagefind/default-ui) markup, documented and stable —
 * https://pagefind.app/docs/ui/#styling-the-default-ui
 */
const PAGEFIND_ADAPTER = {
  activate: "() => { document.querySelector('.pagefind-ui__search-input')?.click(); }",
  input: ".pagefind-ui__search-input",
  result: ".pagefind-ui__result"
};

/**
 * docusaurus (@easyops-cn/docusaurus-search-local): the input class
 * (`navbar__search-input`) is a plain literal in the plugin's SearchBar.tsx
 * and confirmed stable. The dropdown is CSS-Modules-hashed but keeps the
 * original name as a substring (`dropdownMenu_PfwI` on the built page);
 * suggestions carry a plain `role="option"`, verified against the built
 * bundle by driving the page. Both the option row and the hashed
 * `hitWrapper` are accepted so either surviving is enough.
 */
const DOCUSAURUS_ADAPTER = {
  activate: "() => { document.querySelector('.navbar__search-input')?.click(); }",
  input: ".navbar__search-input",
  result: '[class*="dropdownMenu"] [role="option"], [class*="dropdownMenu"] [class*="hitWrapper"]'
};

/**
 * vitepress (themeConfig.search.provider = "local"): verified by driving
 * the built page. The navbar renders `#local-search` wrapping a DocSearch
 * button (there is no `.VPNavBarSearchButton` class on the built markup);
 * the modal is `VPLocalSearchBox` with `#localsearch-input` and a
 * `ul.results` whose hits are `a.result` — all plain, non-hashed
 * classes/ids.
 */
const VITEPRESS_ADAPTER = {
  activate: "() => { document.querySelector('#local-search button')?.click(); }",
  input: "#localsearch-input",
  result: "#localsearch-list .result, .results .result"
};

const ADAPTERS = {
  "docs-kudzu": PAGEFIND_ADAPTER,
  "docs-astro": PAGEFIND_ADAPTER,
  "docs-eleventy": PAGEFIND_ADAPTER,
  "docs-docusaurus": DOCUSAURUS_ADAPTER,
  "docs-vitepress": VITEPRESS_ADAPTER
};

/** Second page (order 1, i.e. `routing-01`) of the "routing" section. */
function resolveTargetPath() {
  const corpus = getDocs();
  const routingPages = corpus.pages.filter(page => page.section === "routing");
  const target = routingPages[1];
  if (!target) throw new Error("docs-data corpus has fewer than 2 pages in the 'routing' section");
  if (!TERMS.includes(SEARCH_TERM)) throw new Error(`SEARCH_TERM ${JSON.stringify(SEARCH_TERM)} is not in docs-data TERMS`);
  return `/guide/${target.section}/${target.slug}/`;
}

function parseArgs(argv) {
  const options = { variant: null, runs: 3, cpu: 4, net: "slow4g", throttle: true, out: "bench" };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--variant") options.variant = argv[++index];
    else if (flag === "--runs") options.runs = Number(argv[++index]);
    else if (flag === "--cpu") options.cpu = Number(argv[++index]);
    else if (flag === "--net") options.net = argv[++index];
    else if (flag === "--out") options.out = argv[++index];
    else if (flag === "--no-throttle") options.throttle = false;
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!NETWORK[options.net]) throw new Error(`--net must be one of ${Object.keys(NETWORK).join(", ")}`);
  if (options.variant && !DOCS_VARIANTS.includes(options.variant)) {
    throw new Error(`--variant must be one of ${DOCS_VARIANTS.join(", ")}`);
  }
  return options;
}

/** Serve one variant's build output under its deploy base. */
function startServer(distDir, variant) {
  const prefix = `${BASE_PATH}/${variant}`;
  const server = createServer((request, response) => {
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
    const relativePath = pathname.slice(prefix.length).replace(/^\/+/, "");
    let file = path.join(distDir, relativePath);
    if (!file.startsWith(distDir)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!existsSync(file)) {
      // cleanUrls output (VitePress): pages are flat `<slug>.html` files with
      // no directory form, so `/guide/x/y/` and `/guide/x/y` both resolve to
      // `guide/x/y.html` — the same lenient mapping GitHub Pages applies.
      const flat = `${file.replace(/[\\/]+(index\.html)?$/, "")}.html`;
      if (existsSync(flat)) {
        file = flat;
      } else {
        response.writeHead(404).end();
        return;
      }
    }
    response.writeHead(200, {
      "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "public, max-age=3600"
    });
    createReadStream(file).pipe(response);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

/**
 * Resolve when `predicate` is true in the page, and report the time
 * relative to navigationStart rather than to the polling loop. Identical
 * to shop-bench.mjs's CONTENT_READY (duplicated, not imported — see file
 * header).
 */
const CONTENT_READY = `(selector, pattern, budget) => new Promise(resolve => {
  const matches = () => {
    const node = document.querySelector(selector);
    return node && node.textContent.trim() && (!pattern || new RegExp(pattern).test(node.textContent));
  };
  const done = () => resolve(performance.now());
  if (matches()) return done();
  const observer = new MutationObserver(() => { if (matches()) { observer.disconnect(); done(); } });
  observer.observe(document, { childList: true, subtree: true, characterData: true });
  // Budgeted, unlike shop-bench's copy: a 404'd or shell-only document would
  // otherwise park the whole run forever (observed with VitePress cleanUrls
  // before the flat-file fallback above existed).
  setTimeout(() => { observer.disconnect(); resolve(null); }, budget);
})`;

/**
 * Click `activate`, type `query` into `input`, and report the time from the
 * first attempt to the attempt whose result actually landed — the same
 * "retry until wired up" shape as shop-bench.mjs's INTERACT, because a
 * search box that exists in the DOM before its JS bundle arrives would
 * otherwise report a false near-zero readiness.
 */
const SEARCH_READY = `(activateSource, inputSelector, resultSelector, query, budget) => new Promise(resolve => {
  const activate = new Function('return (' + activateSource + ')')();
  const opened = performance.now();
  let settled = false;
  const hasResult = () => {
    const node = document.querySelector(resultSelector);
    return Boolean(node && node.textContent && node.textContent.trim());
  };
  const finish = ok => {
    if (settled) return;
    settled = true;
    clearInterval(retry);
    resolve({ ok, searchReady: performance.now() - opened });
  };
  const attempt = () => {
    if (settled) return;
    if (performance.now() - opened > budget) return finish(false);
    try {
      activate();
      const field = document.querySelector(inputSelector);
      if (field) {
        field.focus();
        field.value = query;
        field.dispatchEvent(new InputEvent('input', { bubbles: true, data: query }));
      }
    } catch { /* search UI not wired up yet */ }
    if (hasResult()) finish(true);
  };
  const retry = setInterval(attempt, 50);
  attempt();
})`;

const isScriptTransfer = entry => /javascript|ecmascript/i.test(entry.mimeType) || /\.[cm]?js(\?|$)/.test(entry.url);

/** One docs session: entry navigation, content-ready, then search. */
async function runDocSession(browser, origin, variant, targetPath, options) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const cdp = await page.context().newCDPSession(page);
  // Network domain is always enabled — byte accounting doesn't depend on
  // --no-throttle, only the emulated latency/bandwidth does.
  await cdp.send("Network.enable");
  if (options.throttle) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: options.cpu });
    const profile = NETWORK[options.net];
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: profile.latency,
      downloadThroughput: profile.download,
      uploadThroughput: profile.upload
    });
  }

  // Wall-clock (Date.now()) bucketing rather than CDP's own `timestamp`
  // field, which lives on a different clock than the page's
  // performance.now() and would need a second cross-domain sync call to
  // reconcile — overkill for bucketing byte totals into "before/after a
  // ~1s-scale milestone", which tolerates Node event-loop jitter fine.
  const responseMeta = new Map();
  const transfers = [];
  cdp.on("Network.responseReceived", event => {
    responseMeta.set(event.requestId, { url: event.response.url, mimeType: event.response.mimeType });
  });
  cdp.on("Network.loadingFinished", event => {
    const meta = responseMeta.get(event.requestId) ?? { url: "", mimeType: "" };
    transfers.push({ atMs: Date.now(), url: meta.url, mimeType: meta.mimeType, bytes: event.encodedDataLength ?? 0 });
  });

  const adapter = ADAPTERS[variant];
  const url = `${origin}${BASE_PATH}/${variant}${targetPath}`;

  try {
    await page.goto(url, { waitUntil: "commit" });
    const contentReadyMs = await page.evaluate(`(${CONTENT_READY})(${JSON.stringify(".doc-title")}, null, 15000)`);
    if (contentReadyMs === null) throw new Error(`${variant}: .doc-title never appeared at ${url} within 15000 ms`);

    // "Initial JS" is bounded by the `load` event, not by content-ready:
    // static-first variants paint their doc-title from server-rendered HTML
    // well before their framework runtime finishes downloading, so gating on
    // content-ready would undercount exactly the variants doing the least
    // client-side work — the opposite of what this metric should reward.
    await page.waitForLoadState("load", { timeout: 20000 });
    const initialJsBoundaryAtMs = Date.now();
    const initialJsBytes = transfers
      .filter(entry => entry.atMs <= initialJsBoundaryAtMs && isScriptTransfer(entry))
      .reduce((sum, entry) => sum + entry.bytes, 0);

    const searchStartAtMs = Date.now();
    const search = await page.evaluate(
      `(${SEARCH_READY})(${JSON.stringify(adapter.activate)}, ${JSON.stringify(adapter.input)}, ${JSON.stringify(adapter.result)}, ${JSON.stringify(SEARCH_TERM)}, 8000)`
    );
    const searchReadyAtMs = Date.now();
    if (!search.ok) {
      throw new Error(`${variant}: search UI never produced a result within 8000 ms — check ADAPTERS["${variant}"] selectors against the built page`);
    }
    const searchBytes = transfers
      .filter(entry => entry.atMs > searchStartAtMs && entry.atMs <= searchReadyAtMs)
      .reduce((sum, entry) => sum + entry.bytes, 0);

    return { contentReadyMs, initialJsBytes, searchReadyMs: search.searchReady, searchBytes };
  } finally {
    // Always tear the context down — a failed probe otherwise leaves the
    // page's keep-alive sockets pinning the per-variant HTTP server open,
    // which kept the whole process alive after a reported failure.
    await context.close();
  }
}

const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};

async function runVariant(browser, variant, targetPath, options) {
  const distDir = DIST_CANDIDATES.map(name => path.join(repoRoot, "apps", variant, name)).find(existsSync);
  if (!distDir) throw new Error(`no build output under apps/${variant} — build the variant first`);

  const { server, port } = await startServer(distDir, variant);
  const origin = `http://127.0.0.1:${port}`;

  try {
    // One warm-up session, discarded: the first run pays for disk caches
    // and, on the throttled network, DNS/TCP-equivalent setup that no real
    // session pays twice.
    await runDocSession(browser, origin, variant, targetPath, options);

    const samples = [];
    for (let run = 0; run < options.runs; run++) samples.push(await runDocSession(browser, origin, variant, targetPath, options));

    const pick = key => samples.map(sample => sample[key]);
    const report = {
      variant,
      runs: options.runs,
      throttling: options.throttle ? { cpu: `${options.cpu}x`, network: options.net } : "none",
      measuredAt: new Date().toISOString(),
      targetPath,
      searchQuery: SEARCH_TERM,
      metrics: {
        contentReadyMs: +median(pick("contentReadyMs")).toFixed(1),
        initialJsBytes: Math.round(median(pick("initialJsBytes"))),
        searchReadyMs: +median(pick("searchReadyMs")).toFixed(1),
        searchBytes: Math.round(median(pick("searchBytes")))
      },
      samples
    };

    mkdirSync(path.join(repoRoot, options.out), { recursive: true });
    const file = path.join(repoRoot, options.out, `${variant}.json`);
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`\n${variant} — ${options.runs} sessions, ${report.throttling === "none" ? "unthrottled" : `${options.cpu}x CPU / ${options.net}`}`);
    console.log(`  content ready   ${String(report.metrics.contentReadyMs).padStart(8)} ms`);
    console.log(`  initial JS      ${String(report.metrics.initialJsBytes).padStart(8)} bytes`);
    console.log(`  search ready    ${String(report.metrics.searchReadyMs).padStart(8)} ms`);
    console.log(`  search bytes    ${String(report.metrics.searchBytes).padStart(8)} bytes`);
    console.log(`  wrote ${path.relative(repoRoot, file)}`);

    return report;
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targetPath = resolveTargetPath();
  const variants = options.variant ? [options.variant] : DOCS_VARIANTS;

  const browser = await chromium.launch();
  const reports = [];
  const failures = [];
  try {
    for (const variant of variants) {
      try {
        reports.push(await runVariant(browser, variant, targetPath, options));
      } catch (error) {
        failures.push({ variant, message: error.message });
        console.error(`\n${variant}: ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (reports.length > 1) {
    console.log(`\n요약 (${targetPath}, 검색어 "${SEARCH_TERM}")`);
    console.log("variant".padEnd(18), "content ready".padStart(14), "initial JS".padStart(12), "search ready".padStart(14), "search bytes".padStart(14));
    for (const report of reports) {
      console.log(
        report.variant.padEnd(18),
        `${report.metrics.contentReadyMs} ms`.padStart(14),
        `${report.metrics.initialJsBytes} B`.padStart(12),
        `${report.metrics.searchReadyMs} ms`.padStart(14),
        `${report.metrics.searchBytes} B`.padStart(14)
      );
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length}/${variants.length} variant(s) failed: ${failures.map(entry => entry.variant).join(", ")}`);
    process.exitCode = 1;
  }
}

await main();
