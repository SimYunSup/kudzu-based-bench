#!/usr/bin/env node
/**
 * Publish the form-wizard measurements so they survive a clone.
 *
 * `bench/` is gitignored, so anything a chart or the landing page reads has to
 * be republished under `landing/`. `shop-report.mjs` does that for commerce;
 * this is the same step for the form fixture, and the reason the wizard's
 * resilience chart can be regenerated without re-running a 20-minute bench.
 *
 * Missing variants are skipped rather than fatal: measuring one variant and
 * republishing is a normal thing to want.
 *
 * Usage:
 *   node scripts/form-report.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const benchDir = path.join(repoRoot, "bench");

/** Display order and labels; also the set of variants the report covers. */
const VARIANTS = [
  { key: "form-kudzu", label: "Kudzu", based: "Kudzu (JSX, no vDOM)" },
  { key: "form-astro", label: "Astro", based: "Astro + inline script" },
  { key: "form-react-router", label: "React Router", based: "React Router v8" },
  { key: "form-tanstack", label: "TanStack Start", based: "TanStack Start" },
  { key: "form-next-app", label: "Next.js App Router", based: "Next.js App Router" }
];

/**
 * Capabilities probed under each degradation, in journey order — the same list
 * `form-bench.mjs` probes, kept here because the published file carries counts
 * and the counts have to mean the same five things.
 */
const CAPABILITIES = ["stepAdvance", "statePropagation", "conditionalToggle", "summaryRender", "refRender"];

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);

function main() {
  const rows = [];
  for (const variant of VARIANTS) {
    const bench = readJson(path.join(benchDir, `${variant.key}.json`));
    if (!bench) continue;

    const step = (name, field) => bench.steps?.find((entry) => entry.step === name)?.[field] ?? null;
    // Resilience collapses to "how many of the five still work", per condition.
    const resilience = bench.resilience
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
      measuredAt: bench.measuredAt ?? null,
      entryContentReadyMs: step("step1:entry", "contentReadyMs"),
      toggleLatencyMs: step("step1:toggle-team", "stepLatencyMs"),
      arrivalMs: step("step2:arrival", "arrivalMs"),
      // The axis the fixture exists to measure: submit -> the next step's
      // hidden inputs actually carrying the state forward.
      stateReadyMs: step("step2:arrival", "stateReadyMs"),
      summaryReadyMs: step("step3:arrival", "summaryReadyMs"),
      refReadyMs: step("done:arrival", "refReadyMs"),
      refIntegrity: bench.refIntegrity
        ? {
            matchedRuns: bench.refIntegrity.matchedRuns,
            totalRuns: bench.refIntegrity.totalRuns,
            expected: bench.refIntegrity.sample?.expected ?? null
          }
        : null,
      resilience,
      resilienceTotal: resilience ? Object.values(resilience).reduce((sum, value) => sum + value, 0) : null,
      resilienceMax: resilience ? Object.keys(resilience).length * CAPABILITIES.length : null
    });
  }

  if (!rows.length) {
    console.error("form-report: no form measurements in bench/ — run form:bench first");
    process.exitCode = 1;
    return;
  }

  rows.sort((a, b) => (a.stateReadyMs ?? Infinity) - (b.stateReadyMs ?? Infinity));

  const sample = readJson(path.join(benchDir, `${rows[0].key}.json`));
  const report = {
    measuredAt: new Date().toISOString(),
    // When the browsers actually ran, as opposed to when this file was joined.
    // Charts label themselves with this, so it has to be the bench's clock —
    // and variants get re-measured one at a time, hence a range.
    benchMeasuredFrom: rows.reduce((first, row) => (!first || row.measuredAt < first ? row.measuredAt : first), ""),
    benchMeasuredAt: rows.reduce((latest, row) => (row.measuredAt > latest ? row.measuredAt : latest), ""),
    sessions: sample?.sessions ?? null,
    throttling: sample?.throttling ?? null,
    capabilities: CAPABILITIES,
    rows
  };

  mkdirSync(path.join(repoRoot, "landing"), { recursive: true });
  const file = path.join(repoRoot, "landing", "form.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`form-report: landing/form.json updated (${rows.length} variants)`);
}

main();
