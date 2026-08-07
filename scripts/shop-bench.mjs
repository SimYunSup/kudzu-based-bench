#!/usr/bin/env node
/**
 * Commerce fixture benchmark — session replay, not Lighthouse cells.
 *
 * Why not Cold LCP / Warm LCP:
 *
 * Nobody has a "cold visit" and a "warm visit". People have a *session*: they
 * land on one page with an empty cache, then move through four or five more
 * pages that reuse whatever the first page already fetched. Splitting that
 * into two synthetic buckets throws away the only interesting part — how the
 * cost is distributed across the session — and LCP itself is usually the
 * product photo, which is byte-identical across variants here and therefore
 * measures nothing about the framework.
 *
 * This harness replays one session per run and reports, per step:
 *
 *   contentReady   navigationStart -> the step's key text is in the DOM.
 *                  Text, not LCP: the product title and price are what the
 *                  shopper is waiting for, and they are what the rendering
 *                  architecture actually decides.
 *   actReady       navigationStart -> the step's primary control actually
 *                  works. Measured by dispatching it, not by inspecting
 *                  framework internals.
 *   clickLoss      share of add-to-cart clicks dispatched at FCP + delta
 *                  that do nothing. This is the impatient tap, and it is the
 *                  metric hydration frameworks structurally lose.
 *   stepLatency    event -> next paint for each in-page interaction, the
 *                  same definition INP uses.
 *
 * Everything is measured in-page. External CDP polling adds 40+ ms to short
 * operations (see kudzu's own PERFORMANCE.md, which discarded a run for
 * exactly that reason).
 *
 * Usage:
 *   node scripts/shop-bench.mjs --variant shop-kudzu
 *   node scripts/shop-bench.mjs --variant shop-kudzu --runs 7 --cpu 6 --net slow4g
 *   node scripts/shop-bench.mjs --variant shop-kudzu --no-throttle
 */
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const BASE_PATH = "/ones-to-watch-refactor-test";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

/** Chrome's own "Slow 4G" preset, so numbers line up with DevTools traces. */
const NETWORK = {
  slow4g: { latency: 150, download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8 },
  fast4g: { latency: 40, download: (9 * 1024 * 1024) / 8, upload: (1.5 * 1024 * 1024) / 8 }
};

/** Delays after first paint at which the impatient tap is simulated. */
const CLICK_DELAYS = [0, 100, 300, 500, 1000];

function parseArgs(argv) {
  const options = { variant: "shop-kudzu", runs: 5, cpu: 4, net: "slow4g", throttle: true, out: "bench" };
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
  return options;
}

/**
 * Serve one variant's build output under its deploy base, the same way
 * scripts/lib/site-server.mjs serves the newsletter variants.
 */
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
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      // No caching decisions of our own: the session replay must observe the
      // browser's ordinary behaviour, and every variant gets the same headers.
      "cache-control": "public, max-age=3600"
    });
    createReadStream(file).pipe(response);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

async function applyThrottling(page, options) {
  if (!options.throttle) return;
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: options.cpu });
  const profile = NETWORK[options.net];
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.latency,
    downloadThroughput: profile.download,
    uploadThroughput: profile.upload
  });
  return session;
}

/**
 * Resolve when `predicate` is true in the page, and report the time relative
 * to navigationStart rather than to the polling loop.
 */
const CONTENT_READY = `(selector, pattern) => new Promise(resolve => {
  const matches = () => {
    const node = document.querySelector(selector);
    return node && node.textContent.trim() && (!pattern || new RegExp(pattern).test(node.textContent));
  };
  const done = () => resolve(performance.now());
  if (matches()) return done();
  const observer = new MutationObserver(() => { if (matches()) { observer.disconnect(); done(); } });
  observer.observe(document, { childList: true, subtree: true, characterData: true });
})`;

/**
 * Perform a real interaction and report two different things.
 *
 * The control exists in the served HTML long before the capability code that
 * makes it work has arrived, so a single dispatch measures whichever of the
 * two happens to dominate. Instead the action is retried until it takes:
 *
 *   actReady     first attempt -> the attempt that actually worked. The cost
 *                of the page not being wired up yet.
 *   stepLatency  the successful dispatch -> next paint. The cost of the
 *                interaction itself, INP's definition.
 *
 * A framework that ships a live document scores near zero on the first and
 * is judged purely on the second; one that has to boot pays on both.
 */
const INTERACT = `(actionSource, verifySource, budget) => new Promise(resolve => {
  const action = new Function('return (' + actionSource + ')')();
  const verify = new Function('return (' + verifySource + ')')();
  // Compare against a baseline captured before the first attempt, so a
  // mutation already in flight cannot be mistaken for the action landing.
  const baseline = JSON.stringify(verify());
  const changed = () => JSON.stringify(verify()) !== baseline;
  const opened = performance.now();
  let attemptAt = opened;
  let settled = false;
  const finish = ok => {
    if (settled) return;
    settled = true;
    observer.disconnect();
    clearInterval(retry);
    const landed = performance.now();
    requestAnimationFrame(() => resolve({
      ok,
      actReady: attemptAt - opened,
      stepLatency: landed - attemptAt,
      paint: performance.now() - attemptAt
    }));
  };
  const observer = new MutationObserver(() => { if (changed()) finish(true); });
  observer.observe(document, { childList: true, subtree: true, characterData: true, attributes: true });
  const attempt = () => {
    if (settled) return;
    if (performance.now() - opened > budget) return finish(false);
    attemptAt = performance.now();
    try { action(); } catch { /* control not usable yet */ }
    if (changed()) finish(true);
  };
  const retry = setInterval(attempt, 50);
  attempt();
})`;

/** One full shopping session in one fresh context. */
async function runSession(browser, origin, variant, options) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await applyThrottling(page, options);
  const url = suffix => `${origin}${BASE_PATH}/${variant}${suffix}`;
  const steps = [];

  const visit = async (label, target, selector, pattern) => {
    await page.goto(url(target), { waitUntil: "commit" });
    const contentReady = await page.evaluate(`(${CONTENT_READY})(${JSON.stringify(selector)}, ${JSON.stringify(pattern ?? null)})`);
    steps.push({ step: label, contentReady });
  };

  // visit() resolves the moment the step's key text is parsed, which under
  // `waitUntil: "commit"` is usually mid-stream. Two waits before measuring:
  //
  //   readyState !== "loading"  parsing is complete, so the verify baseline
  //                             cannot drift just because more markup arrived.
  //                             Per spec this is set *before* deferred scripts
  //                             run, so it does not hide any framework's boot.
  //   waitForSelector(ready)    the control itself is in the document.
  const interact = async (label, ready, actionSource, verifySource) => {
    await page.waitForFunction(() => document.readyState !== "loading");
    await page.waitForSelector(ready, { state: "attached" });
    const result = await page.evaluate(
      `(${INTERACT})(${JSON.stringify(actionSource)}, ${JSON.stringify(verifySource)}, 8000)`
    );
    if (!result.ok) throw new Error(`${label}: interaction never took effect within 8000 ms`);
    steps.push({ step: label, actReady: result.actReady, stepLatency: result.stepLatency });
  };

  // 1. Entry from an ad or search result: empty cache, deep link to a product.
  await visit("entry:product", "/product/p-00000/", ".product-price", "[0-9]");

  // 2. The impatient tap. Reload the same URL per delay so the measurement
  //    always starts from a real navigation, and keep the warmed cache
  //    because that is what a repeat impression looks like.
  const clickLoss = [];
  for (const delay of CLICK_DELAYS) {
    await page.goto(url("/product/p-00001/"), { waitUntil: "commit" });
    const outcome = await page.evaluate(`(async delay => {
      const paint = await new Promise(resolve => {
        const entry = performance.getEntriesByName('first-contentful-paint')[0];
        if (entry) return resolve(entry.startTime);
        new PerformanceObserver((list, observer) => {
          const found = list.getEntries().find(item => item.name === 'first-contentful-paint');
          if (found) { observer.disconnect(); resolve(found.startTime); }
        }).observe({ type: 'paint', buffered: true });
      });
      const wait = paint + delay - performance.now();
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      const before = localStorage.getItem('otw-cart');
      document.querySelector('.add-to-cart')?.click();
      await new Promise(resolve => setTimeout(resolve, 250));
      return { delay, worked: localStorage.getItem('otw-cart') !== before };
    })(${delay})`);
    clickLoss.push(outcome);
    await page.evaluate(() => localStorage.removeItem("otw-cart"));
  }

  // 3. In-session navigation to the listing, then the two real interactions.
  //    Actions dispatch the same events a user produces; verification always
  //    compares observable output against the pre-action baseline.
  await visit("nav:listing", "/search/", ".tile-title");
  // Sort first, then filter: sorting a list a filter already reduced to six
  // near-identical items can leave the order unchanged, which is
  // indistinguishable from a broken interaction.
  //
  // Both verifications assert the semantic outcome (prices ascending, grid
  // reduced to the matching subset) rather than "something in the DOM moved",
  // so a hydration re-render cannot be mistaken for the interaction landing.
  await interact(
    "sort",
    ".search-controls select",
    `() => { const select = document.querySelector('.search-controls select'); select.value = 'price'; select.dispatchEvent(new Event('change', { bubbles: true })); }`,
    `() => { const prices = [...document.querySelectorAll('.tile-price')].map(node => Number(node.textContent.replace(/[^0-9]/g, ''))); return prices.length >= 40 && prices.every((price, index) => index === 0 || prices[index - 1] <= price); }`
  );
  await interact(
    "filter",
    "#q",
    `() => { const field = document.querySelector('#q'); field.focus(); field.value = '스웨터'; field.dispatchEvent(new InputEvent('input', { bubbles: true, data: '스웨터' })); }`,
    `() => { const titles = [...document.querySelectorAll('.tile-title')].map(node => node.textContent); return titles.length > 0 && titles.length < 40 && titles.every(title => title.includes('스웨터')); }`
  );

  // 4. Listing -> detail -> variant -> add -> checkout.
  await visit("nav:detail", "/product/p-00002/", ".product-price", "[0-9]");
  await interact(
    "selectVariant",
    "fieldset:nth-of-type(2) .option",
    `() => { const options = [...document.querySelectorAll('fieldset:nth-of-type(2) .option')].filter(node => !node.disabled && node.getAttribute('aria-pressed') !== 'true'); options[options.length - 1].click(); }`,
    `() => document.querySelector('.product-price').textContent + '/' + [...document.querySelectorAll('fieldset:nth-of-type(2) .option')].map(node => node.getAttribute('aria-pressed')).join('')`
  );
  await interact(
    "addToCart",
    ".add-to-cart",
    `() => document.querySelector('.add-to-cart').click()`,
    `() => Boolean(document.querySelector('.add-confirm'))`
  );
  await visit("nav:checkout", "/checkout/", ".checkout h1");

  await context.close();
  return { steps, clickLoss };
}

const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  // Each framework names its static output differently; probe the known ones
  // rather than forcing a shared convention onto the variants.
  const candidates = ["dist", "out", "build/client", "_site"].map(name => path.join(repoRoot, "apps", options.variant, name));
  const distDir = candidates.find(candidate => existsSync(candidate));
  if (!distDir) throw new Error(`no build output under apps/${options.variant} — build the variant first`);

  const { server, port } = await startServer(distDir, options.variant);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();

  try {
    // One warm-up session, discarded: the first run pays for page compilation
    // and disk caches that no real session pays twice.
    await runSession(browser, origin, options.variant, options);

    const sessions = [];
    for (let run = 0; run < options.runs; run++) sessions.push(await runSession(browser, origin, options.variant, options));

    const stepNames = sessions[0].steps.map(entry => entry.step);
    const rows = stepNames.map(name => {
      const samples = sessions.map(session => session.steps.find(entry => entry.step === name));
      const pick = key => samples.map(sample => sample[key]).filter(value => value !== undefined);
      const contentReady = pick("contentReady");
      const actReady = pick("actReady");
      const stepLatency = pick("stepLatency");
      return {
        step: name,
        contentReadyMs: contentReady.length ? +median(contentReady).toFixed(1) : null,
        actReadyMs: actReady.length ? +median(actReady).toFixed(1) : null,
        stepLatencyMs: stepLatency.length ? +median(stepLatency).toFixed(1) : null
      };
    });

    const loss = CLICK_DELAYS.map(delay => {
      const attempts = sessions.flatMap(session => session.clickLoss.filter(entry => entry.delay === delay));
      const failed = attempts.filter(entry => !entry.worked).length;
      return { delay, attempts: attempts.length, lossPct: +((failed / attempts.length) * 100).toFixed(1) };
    });
    const firstReliable = loss.find(entry => entry.lossPct === 0);

    const report = {
      variant: options.variant,
      runs: options.runs,
      throttling: options.throttle ? { cpu: `${options.cpu}x`, network: options.net } : "none",
      measuredAt: new Date().toISOString(),
      steps: rows,
      clickLoss: loss,
      timeToFirstReliableClickMs: firstReliable ? firstReliable.delay : null
    };

    mkdirSync(path.join(repoRoot, options.out), { recursive: true });
    const file = path.join(repoRoot, options.out, `${options.variant}.json`);
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`\n${options.variant} — ${options.runs} sessions, ${report.throttling === "none" ? "unthrottled" : `${options.cpu}x CPU / ${options.net}`}\n`);
    console.log("step                content ready       act ready     step latency");
    for (const row of rows) {
      const cell = value => (value === null ? "—" : `${value} ms`);
      console.log(
        row.step.padEnd(20),
        cell(row.contentReadyMs).padStart(13),
        cell(row.actReadyMs).padStart(14),
        cell(row.stepLatencyMs).padStart(16)
      );
    }
    console.log("\nimpatient tap (add-to-cart at first paint + delay)");
    for (const entry of loss) console.log(`  +${String(entry.delay).padStart(4)} ms   loss ${String(entry.lossPct).padStart(5)}%   (${entry.attempts} attempts)`);
    console.log(`\ntime to first reliable click: ${report.timeToFirstReliableClickMs === null ? "never within 1000 ms" : `${report.timeToFirstReliableClickMs} ms after first paint`}`);
    console.log(`\nwrote ${path.relative(repoRoot, file)}`);
  } finally {
    await browser.close();
    server.close();
  }
}

await main();
