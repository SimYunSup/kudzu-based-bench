#!/usr/bin/env node
/**
 * Collapse the commerce measurements into one file the landing page can render.
 *
 * Three scripts produce three shapes — `shop-bench.mjs` writes one file per
 * variant (session replay, click loss, resilience), `shop-assets.mjs` writes
 * per-route JavaScript weight, `shop-scale.mjs` writes the catalog sweep. The
 * landing page should not have to know that, or fetch four files and join
 * them in the browser, so the join happens here.
 *
 * Missing inputs are skipped rather than fatal: running only `shop:bench` and
 * regenerating the landing table is a normal thing to want.
 *
 * Usage:
 *   node scripts/shop-report.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const benchDir = path.join(repoRoot, "bench");

/** Display order and labels; also the set of variants the report covers. */
const VARIANTS = [
  { key: "shop-kudzu", label: "Kudzu", based: "Kudzu (JSX, no vDOM)" },
  { key: "shop-astro", label: "Astro", based: "Astro + React islands" },
  { key: "shop-react-router", label: "React Router", based: "React" },
  { key: "shop-tanstack", label: "TanStack Start", based: "React" },
  { key: "shop-next-app", label: "Next.js App Router", based: "React" }
];

/** Capabilities probed under each degradation, in journey order. */
const CAPABILITIES = ["readContent", "navigate", "openDetail", "filter", "selectVariant", "addToCart"];

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);

function main() {
  const assets = readJson(path.join(benchDir, "shop-assets.json"));
  const scale = readJson(path.join(benchDir, "shop-scale.json"));

  const rows = [];
  for (const variant of VARIANTS) {
    const bench = readJson(path.join(benchDir, `${variant.key}.json`));
    const routes = assets?.variants?.[variant.key]?.routes;
    const output = assets?.variants?.[variant.key]?.output;
    const sizes = scale?.variants?.[variant.key];
    if (!bench && !routes && !sizes) continue;

    const step = (name, field) => bench?.steps?.find((entry) => entry.step === name)?.[field] ?? null;
    // Resilience collapses to "how many of the six still work", per condition.
    const resilience = bench?.resilience
      ? Object.fromEntries(
          Object.entries(bench.resilience).map(([condition, result]) => [
            condition,
            CAPABILITIES.filter((capability) => result[capability]).length
          ])
        )
      : null;

    rows.push({
      key: variant.key,
      label: variant.label,
      based: variant.based,
      path: `/${variant.key}/`,
      measuredAt: bench?.measuredAt ?? null,
      entryContentReadyMs: step("entry:product", "contentReadyMs"),
      // The listing is the first page in the journey that needs its JavaScript
      // alive, so its actReady is where the boot cost actually shows up.
      listingActReadyMs: step("sort", "actReadyMs"),
      sortLatencyMs: step("sort", "stepLatencyMs"),
      addLatencyMs: step("addToCart", "stepLatencyMs"),
      firstReliableClickMs: bench ? bench.timeToFirstReliableClickMs : null,
      clickLoss: bench?.clickLoss ?? null,
      resilience,
      resilienceTotal: resilience ? Object.values(resilience).reduce((sum, value) => sum + value, 0) : null,
      resilienceMax: resilience ? Object.keys(resilience).length * CAPABILITIES.length : null,
      homeJsGzip: routes?.home?.gzip ?? null,
      searchJsGzip: routes?.search?.gzip ?? null,
      checkoutJsGzip: routes?.checkout?.gzip ?? null,
      outputBytes: output?.bytes ?? null,
      scale: sizes ?? null
    });
  }

  if (!rows.length) {
    console.error("shop-report: no commerce measurements in bench/ — run shop:bench / shop:assets / shop:scale first");
    process.exitCode = 1;
    return;
  }

  // Rank by the metric the fixture exists to expose. Variants that never
  // recovered within the probe window sort last rather than being dropped.
  rows.sort((a, b) => (a.firstReliableClickMs ?? Infinity) - (b.firstReliableClickMs ?? Infinity));

  const report = {
    measuredAt: new Date().toISOString(),
    // When the browsers actually ran, as opposed to when this file was joined.
    // Charts label themselves with this, so it has to be the bench's clock —
    // and variants get re-measured one at a time, hence a range.
    benchMeasuredFrom: rows.reduce((first, row) => (!first || row.measuredAt < first ? row.measuredAt : first), ""),
    benchMeasuredAt: rows.reduce((latest, row) => (row.measuredAt > latest ? row.measuredAt : latest), ""),
    sources: {
      bench: rows.filter((row) => row.clickLoss).map((row) => row.key),
      assets: assets ? assets.measuredAt : null,
      scale: scale ? scale.measuredAt : null
    },
    sizes: scale?.sizes ?? null,
    rows
  };

  mkdirSync(path.join(repoRoot, "landing"), { recursive: true });
  const file = path.join(repoRoot, "landing", "commerce.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`shop-report: landing/commerce.json updated (${rows.length} variants)`);
}

main();
