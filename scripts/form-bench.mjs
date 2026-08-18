#!/usr/bin/env node
/**
 * Form wizard fixture benchmark — session replay of the workshop signup flow.
 *
 * Structurally this is scripts/shop-bench.mjs's methodology (startServer,
 * applyThrottling, the in-page CONTENT_READY / INTERACT primitives, median
 * aggregation, the degradation/resilience track) replayed against a
 * different journey. Duplicated rather than imported per the fixture's own
 * convention: shop-bench.mjs is not touched, and each bench script stays a
 * single file a reader can audit without following an import graph.
 *
 * Why a session replay instead of per-page Lighthouse cells: the wizard is
 * four GET-chained pages carrying state through hidden inputs and query
 * strings. The only interesting numbers are (a) how long each step's
 * control takes to become usable after navigation, (b) how long the
 * conditional-field toggle takes to react to a real click, (c) how long
 * cross-navigation state (the hidden prefill) takes to land after the
 * previous step's submit, and (d) whether the last step's reference code —
 * a pure function of every field carried across four pages — actually
 * matches what every variant is supposed to compute. Framework boot time
 * shows up in all four without needing a synthetic "TTI" definition.
 *
 * Usage:
 *   node scripts/form-bench.mjs
 *   node scripts/form-bench.mjs --variant form-kudzu
 *   node scripts/form-bench.mjs --variant form-kudzu --sessions 7 --cpu 6 --net slow4g
 *   node scripts/form-bench.mjs --no-throttle
 */
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const BASE_PATH = "/kudzu-based-bench";

const FORM_VARIANTS = ["form-kudzu", "form-astro", "form-react-router", "form-tanstack", "form-next-app"];

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
 * Degradation conditions for the resilience track — the same three real
 * device states shop-bench.mjs probes (ad blocker / captive portal / CDN
 * partial outage), reused verbatim so the two fixtures' resilience numbers
 * are directly comparable.
 */
const DEGRADATIONS = {
  "js-blocked": { label: "JS 전면 차단", block: true },
  "js-slow": { label: "스크립트 2s 지연", delayMs: 2000 },
  "chunk-404": { label: "스크립트 1개 유실", dropNth: 1 }
};

/**
 * Journey capabilities probed under each degradation. Unlike the commerce
 * fixture, "state carry" here is *expected* to fail under js-blocked by
 * contract: the hidden-input prefill is documented as JS-driven, so a loss
 * there is a real, measured property of the design, not a bug in the probe.
 */
const CAPABILITIES = [
  { key: "stepAdvance", label: "스텝 이동" },
  { key: "statePropagation", label: "상태 운반" },
  { key: "conditionalToggle", label: "조건부 토글" },
  { key: "summaryRender", label: "요약 렌더" },
  { key: "refRender", label: "레퍼런스 렌더" }
];

function parseArgs(argv) {
  const options = { variant: null, sessions: 5, cpu: 4, net: "slow4g", throttle: true, out: "bench" };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--variant") options.variant = argv[++index];
    else if (flag === "--sessions") options.sessions = Number(argv[++index]);
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
 * scripts/shop-bench.mjs (and scripts/lib/site-server.mjs) serve the other
 * fixtures.
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
 * Resolve when a selector matches, reporting time relative to
 * navigationStart. Two modes:
 *
 *   "attached"  the control exists and is not disabled — for form controls
 *               (#name, #session) where presence-and-usable is the question,
 *               not textContent (inputs render no text at all).
 *   "text"      the same predicate scripts/shop-bench.mjs uses — non-empty
 *               textContent, optionally matching a pattern — for elements
 *               whose rendered *value* is the question (.summary-name,
 *               .done-ref).
 */
const READY = `(selector, mode, pattern) => new Promise(resolve => {
  const matches = () => {
    const node = document.querySelector(selector);
    if (!node) return false;
    if (mode === "attached") return !node.disabled;
    const text = (node.textContent || "").trim();
    if (!text) return false;
    return !pattern || new RegExp(pattern).test(text);
  };
  const done = () => resolve(performance.now());
  if (matches()) return done();
  const observer = new MutationObserver(() => { if (matches()) { observer.disconnect(); done(); } });
  observer.observe(document, { childList: true, subtree: true, characterData: true, attributes: true });
})`;

/**
 * Perform a real interaction and report two things, identical in spirit to
 * scripts/shop-bench.mjs's INTERACT: actReady (attempt that actually
 * worked, i.e. the cost of the page not being wired up yet) and
 * stepLatency (that attempt -> next paint, INP's definition).
 */
const INTERACT = `(actionSource, verifySource, budget) => new Promise(resolve => {
  const action = new Function('return (' + actionSource + ')')();
  const verify = new Function('return (' + verifySource + ')')();
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
      stepLatency: landed - attemptAt
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

/**
 * Post-submit arrival probe, timed on a wall clock parked in sessionStorage
 * before the submit (same pattern as shop-bench's NAV_ARRIVED). This is the
 * only clock that reads the same for a native GET document load (React
 * Router / Next let the form navigate) and a router-intercepted submit
 * (TanStack rewrites history in the same document): navigationStart-based
 * timing would report a session-relative number for the SPA case and a
 * document-relative one for the MPA case, which are not comparable.
 */
const ARRIVED = `(selector, mode, pattern, budget) => new Promise(resolve => {
  const t0 = Number(sessionStorage.getItem('bench-nav-t0'));
  const matches = () => {
    const node = document.querySelector(selector);
    if (!node) return false;
    if (mode !== 'text') return true;
    const text = (node.textContent || '').trim();
    return Boolean(text) && (!pattern || new RegExp(pattern).test(text));
  };
  const done = () => resolve(Date.now() - t0);
  if (matches()) return done();
  const observer = new MutationObserver(() => { if (matches()) { observer.disconnect(); done(); } });
  observer.observe(document, { childList: true, subtree: true, characterData: true, attributes: true });
  setTimeout(() => { observer.disconnect(); resolve(null); }, budget);
})`;

/**
 * The wizard contract's own reference-code function, duplicated verbatim so
 * the bench can compute the expected value independently and catch a
 * variant whose canonicalisation, hash, or field order drifted from spec.
 */
function refCode(params) {
  const keys = ["name", "email", "type", "team", "session", "diet", "coupon"];
  const canonical = keys.map(key => `${key}=${params.getAll(key).join(",")}`).join("|");
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `REF-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

/** One full signup session in one fresh context. */
async function runSession(browser, origin, variant, options) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await applyThrottling(page, options);
  const url = suffix => `${origin}${BASE_PATH}/${variant}${suffix}`;
  const steps = [];

  const ready = (selector, mode, pattern) =>
    page.evaluate(`(${READY})(${JSON.stringify(selector)}, ${JSON.stringify(mode)}, ${JSON.stringify(pattern ?? null)})`);

  const interact = async (label, readySelector, actionSource, verifySource) => {
    await page.waitForFunction(() => document.readyState !== "loading");
    await page.waitForSelector(readySelector, { state: "attached" });
    const result = await page.evaluate(
      `(${INTERACT})(${JSON.stringify(actionSource)}, ${JSON.stringify(verifySource)}, 8000)`
    );
    if (!result.ok) throw new Error(`${label}: interaction never took effect within 8000 ms`);
    steps.push({ step: label, actReadyMs: result.actReady, stepLatencyMs: result.stepLatency });
  };

  // step.wizard-next submits are dispatched with the framework's own form,
  // via requestSubmit — a native GET chain in the default implementation,
  // a router-intercepted submit in TanStack. The wall clock for the arrival
  // probe is parked in sessionStorage first (see ARRIVED). The evaluate()
  // call can be torn down mid-flight by a full navigation; that is expected
  // and harmless, so it is swallowed rather than surfaced.
  const submit = (formSelector, nextPathFragment) =>
    Promise.all([
      // `commit` rather than the default `load`: the arrival probe must run
      // as soon as the next document exists. Gating on `load` would hold the
      // probe hostage to the new page's script graph (module scripts delay
      // `load`), inflating MPA arrivals while SPA transitions — which never
      // fire a new `load` — are sampled instantly.
      page.waitForURL(next => next.pathname.includes(nextPathFragment), { timeout: 8000, waitUntil: "commit" }),
      page
        .evaluate(selector => {
          sessionStorage.setItem("bench-nav-t0", String(Date.now()));
          document.querySelector(selector)?.requestSubmit();
        }, formSelector)
        .catch(() => {})
    ]);

  // Post-submit arrival, retried because a document navigation destroys the
  // execution context the first evaluate started in (shop-bench pattern).
  const arrived = async (label, selector, mode, pattern) => {
    const deadline = Date.now() + 20000;
    for (;;) {
      try {
        const ms = await page.evaluate(
          `(${ARRIVED})(${JSON.stringify(selector)}, ${JSON.stringify(mode)}, ${JSON.stringify(pattern ?? null)}, 15000)`
        );
        if (ms === null) throw new Error(`${label}: target content never arrived within 15000 ms`);
        return ms;
      } catch (error) {
        if (String(error.message ?? error).includes("never arrived") || Date.now() > deadline) throw error;
        await page.waitForTimeout(25);
      }
    }
  };

  // 1. Entry: empty cache, deep link to step 1.
  await page.goto(url("/"), { waitUntil: "commit" });
  steps.push({ step: "step1:entry", contentReadyMs: await ready("#name", "attached") });

  // 2. Fill the participant fields, then measure the conditional-field
  // toggle as a real interaction. Wait out the framework's own initial hide
  // (individual is the default, so a live implementation hides .team-row on
  // load) before capturing the INTERACT baseline — otherwise that init
  // mutation, not the click, can be mistaken for the measured change.
  await page.fill("#name", "김지우");
  await page.fill("#email", "jiwoo@example.com");
  await page
    .waitForFunction(() => document.querySelector(".team-row")?.hasAttribute("hidden"), null, { timeout: 3000 })
    .catch(() => {});
  await interact(
    "step1:toggle-team",
    'input[name="type"][value="team"]',
    `() => document.querySelector('input[name="type"][value="team"]').click()`,
    `() => { const row = document.querySelector('.team-row'); const field = document.querySelector('#team-name'); return [row?.hasAttribute('hidden'), field?.disabled, field?.required]; }`
  );
  await page.fill("#team-name", "그로스");

  await submit('form[data-step="1"]', "/session");

  // 3. Step 2 arrival: control readiness plus the cross-navigation state
  // carry, both timed from the step-1 submit on the sessionStorage wall
  // clock — the number that matters is "how long did the applicant wait to
  // see the next step / their name reappear", and it must read the same for
  // a document load and a router-intercepted transition.
  const step2ArrivalMs = await arrived("step2:arrival", "#session", "attached");
  await page.waitForFunction(
    () => document.querySelector('.carried input[name="name"]')?.value === "김지우",
    null,
    { polling: 50, timeout: 5000 }
  );
  const stateReadyMs = await page.evaluate(`Date.now() - Number(sessionStorage.getItem("bench-nav-t0"))`);
  steps.push({ step: "step2:arrival", arrivalMs: step2ArrivalMs, stateReadyMs });

  await page.selectOption("#session", "s-03");
  await page.check('input[name="diet"][value="vegan"]');
  await page.check('input[name="diet"][value="glutenfree"]');
  await page.fill("#coupon", "SAVE-2026");
  await submit('form[data-step="2"]', "/review");

  // 4. Review arrival: the summary is a pure render of the carried query
  // string, so its readiness is a direct proxy for "state carry landed".
  steps.push({ step: "step3:arrival", summaryReadyMs: await arrived("step3:arrival", ".summary-name", "text", "김지우") });

  await page.check("#confirm");
  await submit('form[data-step="3"]', "/done");

  // 5. Done arrival: ref readiness, plus an independent recomputation of
  // the reference code against the final URL's query string.
  const refReadyMs = await arrived("done:arrival", ".done-ref", "text", "^REF-[0-9A-F]{8}$");
  steps.push({ step: "done:arrival", refReadyMs });
  const finalUrl = new URL(page.url());
  const actual = ((await page.textContent(".done-ref")) ?? "").trim();
  const expected = refCode(finalUrl.searchParams);

  await context.close();
  return { steps, ref: { ok: actual === expected, expected, actual, query: finalUrl.search } };
}

/**
 * Probe which journey capabilities survive one degraded script environment.
 * One context per condition, one continuous journey through it — the same
 * shape as scripts/shop-bench.mjs's runDegradation.
 */
async function runDegradation(browser, origin, variant, key) {
  const condition = DEGRADATIONS[key];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const url = suffix => `${origin}${BASE_PATH}/${variant}${suffix}`;
  let scriptCount = 0;

  // Matcher, not a glob: `**/*.js` misses a retry with a cache-busting query.
  // Astro's island loader re-requests a failed island script as
  // `client.<hash>.js?astro-retry=<timestamp>`, which does not end in `.js`,
  // so a glob-blocked run delivered the island runtime anyway. An ad blocker
  // or a CDN outage matches by path, not by query.
  await page.route(
    requestUrl => /\.m?js$/.test(requestUrl.pathname),
    async route => {
      if (condition.block) return route.abort();
      if (condition.dropNth !== undefined) {
        scriptCount++;
        if (scriptCount === condition.dropNth + 1) return route.abort();
        return route.continue();
      }
      if (condition.delayMs) await new Promise(resolve => setTimeout(resolve, condition.delayMs));
      return route.continue();
    }
  );

  const settle = async () => {
    await page.waitForLoadState("domcontentloaded");
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

  await page.goto(url("/"), { waitUntil: "commit" });
  await settle();

  // conditionalToggle: proves a *live* click handler moved the state, not
  // that the field happens to be visible already (JS-off default is
  // visible+optional by contract, so "visible after click" alone proves
  // nothing).
  result.conditionalToggle = await can(async () => {
    const before = await page.evaluate(() => {
      const row = document.querySelector(".team-row");
      const field = document.querySelector("#team-name");
      return `${row?.hasAttribute("hidden")}|${field?.disabled}`;
    });
    await page.evaluate(() => document.querySelector('input[name="type"][value="team"]')?.click());
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const row = document.querySelector(".team-row");
      const field = document.querySelector("#team-name");
      return `${row?.hasAttribute("hidden")}|${field?.disabled}`;
    });
    return after !== before;
  });

  // stepAdvance: the native GET chain should reach step 2 even with no JS
  // at all — that resilience is the whole point of the chain being native.
  // All URL waits in this journey use `commit`: under the 2 s script delay a
  // module-script page's DOMContentLoaded/`load` arrive seconds late, and
  // waiting for them misreads a perfectly successful native navigation as a
  // failure. Arrival is proven by the next form's control being parsed.
  result.stepAdvance = await can(async () => {
    await page.fill("#name", "김지우");
    await page.fill("#email", "jiwoo@example.com");
    if (await page.$("#team-name")) await page.fill("#team-name", "그로스", { timeout: 2000 }).catch(() => {});
    await page.click(".wizard-next", { timeout: 2000 });
    await page.waitForURL(next => next.pathname.includes("/session"), { timeout: 4000, waitUntil: "commit" });
    await page.waitForSelector("#session", { state: "attached", timeout: 4000 });
    return true;
  });

  // statePropagation: the hidden prefill is documented as JS-driven, so
  // this is expected to read false under js-blocked — a real, measured
  // property of the design rather than a probe bug.
  result.statePropagation = await can(async () => {
    await page.waitForTimeout(300);
    return page.evaluate(() => document.querySelector('.carried input[name="name"]')?.value === "김지우");
  });

  await page.selectOption("#session", "s-03").catch(() => {});
  await page.check('input[name="diet"][value="vegan"]').catch(() => {});
  await page.fill("#coupon", "SAVE-2026").catch(() => {});
  await page.click(".wizard-next", { timeout: 2000 }).catch(() => {});
  await page.waitForURL(next => next.pathname.includes("/review"), { timeout: 4000, waitUntil: "commit" }).catch(() => {});
  await page.waitForSelector(".summary", { state: "attached", timeout: 4000 }).catch(() => {});

  result.summaryRender = await can(async () => {
    await page.waitForTimeout(300);
    return (await page.evaluate(() => document.querySelector(".summary-name")?.textContent ?? "")).includes("김지우");
  });

  await page.check("#confirm").catch(() => {});
  await page.click(".wizard-next", { timeout: 2000 }).catch(() => {});
  await page.waitForURL(next => next.pathname.includes("/done"), { timeout: 4000, waitUntil: "commit" }).catch(() => {});
  await page.waitForSelector(".done-ref", { state: "attached", timeout: 4000 }).catch(() => {});

  result.refRender = await can(async () => {
    await page.waitForTimeout(300);
    const text = await page.evaluate(() => document.querySelector(".done-ref")?.textContent?.trim() ?? "");
    return /^REF-[0-9A-F]{8}$/.test(text);
  });

  await context.close();
  return result;
}

const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};

/** Every *Ms metric any step recorded, medianed across sessions per step. */
function aggregateSteps(sessions) {
  const stepNames = sessions[0].map(entry => entry.step);
  return stepNames.map(name => {
    const samples = sessions.map(session => session.find(entry => entry.step === name));
    const metricKeys = new Set();
    for (const sample of samples) for (const key of Object.keys(sample)) if (key.endsWith("Ms")) metricKeys.add(key);
    const row = { step: name };
    for (const key of metricKeys) {
      const values = samples.map(sample => sample[key]).filter(value => typeof value === "number");
      row[key] = values.length ? +median(values).toFixed(1) : null;
    }
    return row;
  });
}

async function benchVariant(browser, variant, options) {
  const candidates = ["dist", "out", "build/client", "_site"].map(name => path.join(repoRoot, "apps", variant, name));
  const distDir = candidates.find(candidate => existsSync(candidate));
  if (!distDir) {
    const message = `no build output under apps/${variant} — build the variant first`;
    if (options.variant) throw new Error(message);
    console.warn(`skipping ${variant}: ${message}`);
    return;
  }

  const { server, port } = await startServer(distDir, variant);
  const origin = `http://127.0.0.1:${port}`;

  try {
    // One warm-up session, discarded — the first run pays for page
    // compilation and disk caches no real session pays twice.
    await runSession(browser, origin, variant, options);

    const sessions = [];
    const refs = [];
    for (let run = 0; run < options.sessions; run++) {
      const { steps, ref } = await runSession(browser, origin, variant, options);
      sessions.push(steps);
      refs.push(ref);
    }
    const rows = aggregateSteps(sessions);
    const refIntegrity = {
      matchedRuns: refs.filter(entry => entry.ok).length,
      totalRuns: refs.length,
      sample: refs[0],
      mismatches: refs.filter(entry => !entry.ok)
    };

    // Resilience runs once per condition: outcomes are boolean, so extra
    // repetitions buy nothing the 1.5 s settle window doesn't already.
    const resilience = {};
    for (const key of Object.keys(DEGRADATIONS)) resilience[key] = await runDegradation(browser, origin, variant, key);

    const report = {
      variant,
      sessions: options.sessions,
      throttling: options.throttle ? { cpu: `${options.cpu}x`, network: options.net } : "none",
      measuredAt: new Date().toISOString(),
      steps: rows,
      refIntegrity,
      resilience
    };

    mkdirSync(path.join(repoRoot, options.out), { recursive: true });
    const file = path.join(repoRoot, options.out, `${variant}.json`);
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`\n${variant} — ${options.sessions} sessions, ${report.throttling === "none" ? "unthrottled" : `${options.cpu}x CPU / ${options.net}`}\n`);
    for (const row of rows) {
      const cells = Object.entries(row)
        .filter(([key]) => key !== "step")
        .map(([key, value]) => `${key.replace(/Ms$/, "")} ${value === null ? "—" : `${value} ms`}`)
        .join("   ");
      console.log(`  ${row.step.padEnd(18)} ${cells}`);
    }
    console.log(`\nref 무결성: ${refIntegrity.matchedRuns}/${refIntegrity.totalRuns} 세션 일치`);
    for (const mismatch of refIntegrity.mismatches) {
      console.log(`  불일치: expected ${mismatch.expected} actual ${mismatch.actual} (${mismatch.query})`);
    }

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
    server.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const variants = options.variant ? [options.variant] : FORM_VARIANTS;
  const browser = await chromium.launch();
  try {
    for (const variant of variants) await benchVariant(browser, variant, options);
  } finally {
    await browser.close();
  }
}

await main();
