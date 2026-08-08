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
 *                  metric hydration frameworks structurally lose. Measured in
 *                  its own sessions, never inside the journey — sweeping the
 *                  delay grid warms the module cache enough to erase the very
 *                  gap the journey's actReady is trying to report.
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
const BASE_PATH = "/kudzu-based-bench";

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

/**
 * Delays after first paint at which the impatient tap is simulated.
 *
 * The grid runs to 5 s because a 1 s ceiling saturates: every hydrating
 * variant loses 100% of clicks at every point below it, which collapses a
 * 3x spread in boot time into one indistinguishable "never" bucket. The
 * upper points are coarse on purpose — past ~2 s the interesting question is
 * no longer "how much longer" but "does it ever recover".
 */
const CLICK_DELAYS = [0, 100, 300, 500, 1000, 1500, 2000, 3000, 5000];

/**
 * Degradation conditions for the resilience track.
 *
 * These are not hypotheticals: an ad blocker, a captive-portal proxy, a
 * corporate MITM box, a CDN partial outage, or a subway tunnel all produce
 * one of these three states on a real shopper's device. What a storefront
 * still lets them do in that state is a product property, and no
 * framework benchmark measures it.
 */
const DEGRADATIONS = {
  "js-blocked": { label: "JS 전면 차단", block: true },
  "js-slow": { label: "스크립트 2s 지연", delayMs: 2000 },
  "chunk-404": { label: "스크립트 1개 유실", dropNth: 1 }
};

/** Journey capabilities probed under each degradation. */
const CAPABILITIES = [
  { key: "readContent", label: "상품 정보 읽기" },
  { key: "navigate", label: "카테고리 이동" },
  { key: "openDetail", label: "상세 진입" },
  { key: "filter", label: "검색 필터" },
  { key: "selectVariant", label: "옵션 선택" },
  { key: "addToCart", label: "장바구니 담기" }
];

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

  // 2. In-session navigation to the listing, then the two real interactions.
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

  // 3. Listing -> detail -> variant -> add -> checkout.
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
  return steps;
}

/**
 * The impatient tap, in its own session.
 *
 * This cannot share a context with the journey. Sweeping nine delays up to
 * 5 s means twenty-odd extra seconds of repeated product-page loads, which
 * warms the module cache enough that the journey's first interaction
 * afterwards reads as instant — the probe would be measuring away the very
 * gap it exists to expose. An earlier run had exactly that: Next's listing
 * actReady collapsed from 2,967 ms to 0.1 ms purely from probe ordering.
 *
 * Each delay gets a fresh context so the cache state is identical across
 * the grid, and every attempt starts from a real navigation.
 */
async function runClickLoss(browser, origin, variant, options) {
  const url = suffix => `${origin}${BASE_PATH}/${variant}${suffix}`;
  const outcomes = [];

  for (const delay of CLICK_DELAYS) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await applyThrottling(page, options);
    await page.goto(url("/product/p-00001/"), { waitUntil: "commit" });
    outcomes.push(
      await page.evaluate(`(async delay => {
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
      })(${delay})`)
    );
    await context.close();
  }

  return outcomes;
}

/**
 * Probe which journey capabilities survive one degraded script environment.
 *
 * Runs in a fresh context with a request route installed before any
 * navigation, so the very first document already sees the condition.
 */
async function runDegradation(browser, origin, variant, key) {
  const condition = DEGRADATIONS[key];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const url = suffix => `${origin}${BASE_PATH}/${variant}${suffix}`;
  let scriptCount = 0;

  await page.route("**/*.js", async route => {
    if (condition.block) return route.abort();
    if (condition.dropNth !== undefined) {
      scriptCount++;
      // Drop one script from the middle of the graph rather than the first:
      // losing the entry point is a different (and less interesting) failure
      // than losing one chunk a CDN failed to serve.
      if (scriptCount === condition.dropNth + 1) return route.abort();
      return route.continue();
    }
    if (condition.delayMs) await new Promise(resolve => setTimeout(resolve, condition.delayMs));
    return route.continue();
  });

  const settle = async () => {
    await page.waitForLoadState("domcontentloaded");
    // Enough for a healthy variant to boot, short enough that the 2 s delay
    // condition is still observably degraded.
    await page.waitForTimeout(1500);
  };
  const can = async body => {
    try {
      return Boolean(await body());
    } catch {
      return false;
    }
  };

  const result = {};

  await page.goto(url("/product/p-00000/"), { waitUntil: "commit" });
  await settle();
  result.readContent = await can(() =>
    page.evaluate(() => /[0-9]/.test(document.querySelector(".product-price")?.textContent || ""))
  );
  result.selectVariant = await can(async () => {
    // The pressed option and the price are already correct in the served
    // HTML, so "one option is pressed" proves nothing. The probe only passes
    // if the *selection moved*, which requires a live handler.
    const before = await page.evaluate(() => {
      const pressed = [...document.querySelectorAll("fieldset:nth-of-type(2) .option")].find(node => node.getAttribute("aria-pressed") === "true");
      return `${pressed?.textContent}|${document.querySelector(".product-price")?.textContent}`;
    });
    await page.evaluate(() => {
      const options = [...document.querySelectorAll("fieldset:nth-of-type(2) .option")].filter(
        node => !node.disabled && node.getAttribute("aria-pressed") !== "true"
      );
      options[options.length - 1]?.click();
    });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const pressed = [...document.querySelectorAll("fieldset:nth-of-type(2) .option")].find(node => node.getAttribute("aria-pressed") === "true");
      return `${pressed?.textContent}|${document.querySelector(".product-price")?.textContent}`;
    });
    return after !== before;
  });
  result.addToCart = await can(async () => {
    await page.evaluate(() => localStorage.removeItem("otw-cart"));
    await page.click(".add-to-cart", { timeout: 2000 });
    await page.waitForTimeout(400);
    return page.evaluate(() => localStorage.getItem("otw-cart") !== null);
  });

  // Navigation is probed as a real anchor click, because "the link still
  // works with JS off" is exactly the property being measured.
  result.navigate = await can(async () => {
    await page.click(".menu-link", { timeout: 2000 });
    await page.waitForLoadState("domcontentloaded");
    return page.evaluate(() => document.querySelectorAll("a.tile").length > 0);
  });

  await page.goto(url("/search/"), { waitUntil: "commit" });
  await settle();
  result.filter = await can(async () => {
    await page.evaluate(() => {
      const field = document.querySelector("#q");
      field.value = "스웨터";
      field.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      const titles = [...document.querySelectorAll(".tile-title")].map(node => node.textContent || "");
      return titles.length > 0 && titles.length < 40 && titles.every(title => title.includes("스웨터"));
    });
  });
  result.openDetail = await can(async () => {
    await page.click("a.tile", { timeout: 2000 });
    await page.waitForLoadState("domcontentloaded");
    return page.evaluate(() => document.querySelector(".product-price") !== null);
  });

  await context.close();
  return result;
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

    const stepNames = sessions[0].map(entry => entry.step);
    const rows = stepNames.map(name => {
      const samples = sessions.map(session => session.find(entry => entry.step === name));
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

    const clickRuns = [];
    for (let run = 0; run < options.runs; run++) clickRuns.push(await runClickLoss(browser, origin, options.variant, options));
    const loss = CLICK_DELAYS.map(delay => {
      const attempts = clickRuns.flatMap(outcomes => outcomes.filter(entry => entry.delay === delay));
      const failed = attempts.filter(entry => !entry.worked).length;
      return { delay, attempts: attempts.length, lossPct: +((failed / attempts.length) * 100).toFixed(1) };
    });
    const firstReliable = loss.find(entry => entry.lossPct === 0);

    // Resilience runs once per condition: the outcomes are boolean, so extra
    // repetitions buy nothing that the 1.5 s settle window does not already.
    const resilience = {};
    for (const key of Object.keys(DEGRADATIONS)) resilience[key] = await runDegradation(browser, origin, options.variant, key);

    const report = {
      variant: options.variant,
      runs: options.runs,
      throttling: options.throttle ? { cpu: `${options.cpu}x`, network: options.net } : "none",
      measuredAt: new Date().toISOString(),
      steps: rows,
      clickLoss: loss,
      timeToFirstReliableClickMs: firstReliable ? firstReliable.delay : null,
      resilience
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

    console.log("\n열화 내성 (살아남는 기능)");
    const header = CAPABILITIES.map(entry => entry.label.padStart(13)).join("");
    console.log("".padEnd(18) + header);
    for (const [key, condition] of Object.entries(DEGRADATIONS)) {
      const cells = CAPABILITIES.map(entry => (resilience[key][entry.key] ? "O" : "X").padStart(13)).join("");
      console.log(condition.label.padEnd(18) + cells);
    }
    const survived = Object.values(resilience).flatMap(row => CAPABILITIES.map(entry => row[entry.key]));
    console.log(`  생존 ${survived.filter(Boolean).length} / ${survived.length}`);
    console.log(`\nwrote ${path.relative(repoRoot, file)}`);
  } finally {
    await browser.close();
    server.close();
  }
}

await main();
