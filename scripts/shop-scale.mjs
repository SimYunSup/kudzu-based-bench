#!/usr/bin/env node
/**
 * Catalog build-scaling sweep for the commerce variants.
 *
 * A storefront's build cost is not a constant, it is a curve against catalog
 * size, and the shape of that curve is what decides whether a static export is
 * viable at all. A price batch that rebuilds nightly cares about the slope; a
 * 100-product demo tells you nothing about it.
 *
 * Two numbers per size:
 *
 *   cold  output and every framework build cache deleted — a CI runner
 *         that missed its cache key
 *   warm  output deleted, caches kept — a CI cache hit, or your second
 *         local build. The gap between them is what the cache buys.
 *
 * Neither is "incremental": no deploy pipeline ships on top of a previous
 * build, so the output always starts empty. Only the cache state varies.
 *
 * Usage:
 *   node scripts/shop-scale.mjs                              # all variants, 100/1000
 *   node scripts/shop-scale.mjs --sizes 100,1000,10000
 *   node scripts/shop-scale.mjs --variants shop-kudzu,shop-next-app --runs 3
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OUTPUT_DIRS, cleanBuildArtifacts } from "./lib/build-cache.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function parseArgs(argv) {
  const options = {
    variants: ["shop-kudzu", "shop-next-app", "shop-react-router", "shop-tanstack", "shop-astro"],
    sizes: [100, 1000],
    // Three, not two: a median of two samples is just their average, which
    // is exactly the statistic an outlier ruins. Matches build-stats.mjs.
    runs: 3,
    out: "bench"
  };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--variants") options.variants = argv[++index].split(",");
    else if (flag === "--sizes") options.sizes = argv[++index].split(",").map(Number);
    else if (flag === "--runs") options.runs = Number(argv[++index]);
    else if (flag === "--out") options.out = argv[++index];
    else throw new Error(`unknown flag ${flag}`);
  }
  return options;
}

function clean(appDir) {
  cleanBuildArtifacts(appDir, OUTPUT_DIRS.map(name => path.join(appDir, name)));
}

function outputDir(appDir) {
  return OUTPUT_DIRS.map(name => path.join(appDir, name)).find(existsSync);
}

/** Total bytes and file count, excluding images so variants stay comparable. */
function measureOutput(dir) {
  let bytes = 0;
  let files = 0;
  const walk = current => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (!/\.(png|jpe?g|webp|avif|gif|svg|ico)$/i.test(target)) {
        bytes += statSync(target).size;
        files++;
      }
    }
  };
  walk(dir);
  return { bytes, files };
}

function timeBuild(appDir, size) {
  const started = performance.now();
  execFileSync("pnpm", ["run", "build"], {
    cwd: appDir,
    stdio: "pipe",
    maxBuffer: 1 << 28,
    env: { ...process.env, OTW_CATALOG_SIZE: String(size) }
  });
  return performance.now() - started;
}

const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};

function sweep(variant, options) {
  const appDir = path.join(repoRoot, "apps", variant);
  if (!existsSync(appDir)) return null;
  const rows = [];

  for (const size of options.sizes) {
    // Warm-up, discarded: the first build of a size pays for module
    // resolution and dependency graph work no later build repeats.
    clean(appDir);
    timeBuild(appDir, size);

    // cold: output and framework caches both gone (CI cache miss).
    const coldRuns = [];
    for (let run = 0; run < options.runs; run++) {
      clean(appDir);
      coldRuns.push(timeBuild(appDir, size));
    }

    // warm: output gone, caches kept (CI cache hit, or a second local build).
    // The output always starts empty because no deploy ships on top of a
    // previous build's leftovers; the only thing that varies is the cache.
    const warmRuns = [];
    for (let run = 0; run < options.runs; run++) {
      for (const name of OUTPUT_DIRS) rmSync(path.join(appDir, name), { recursive: true, force: true });
      warmRuns.push(timeBuild(appDir, size));
    }

    const dir = outputDir(appDir);
    const output = dir ? measureOutput(dir) : { bytes: 0, files: 0 };
    rows.push({
      size,
      coldMs: +median(coldRuns).toFixed(0),
      warmMs: +median(warmRuns).toFixed(0),
      coldSamples: coldRuns.map(value => Math.round(value)),
      warmSamples: warmRuns.map(value => Math.round(value)),
      msPerPage: +(median(coldRuns) / size).toFixed(2),
      outputMB: +(output.bytes / 1048576).toFixed(2),
      files: output.files
    });
    console.log(`  ${variant} @${size}: cold ${rows.at(-1).coldMs} ms, warm ${rows.at(-1).warmMs} ms, ${rows.at(-1).outputMB} MB`);
  }

  return rows;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = { measuredAt: new Date().toISOString(), sizes: options.sizes, runs: options.runs, variants: {} };

  for (const variant of options.variants) {
    console.log(`\n${variant}`);
    const rows = sweep(variant, options);
    if (!rows) {
      console.log(`  (apps/${variant} not found — skipped)`);
      continue;
    }
    report.variants[variant] = rows;
  }

  mkdirSync(path.join(repoRoot, options.out), { recursive: true });
  const file = path.join(repoRoot, options.out, "shop-scale.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

  console.log("\ncatalog scaling (cold / warm, median)\n");
  const header = options.sizes.map(size => `${size}p`.padStart(22)).join("");
  console.log("variant".padEnd(20) + header);
  for (const [variant, rows] of Object.entries(report.variants)) {
    const cells = options.sizes
      .map(size => {
        const row = rows.find(entry => entry.size === size);
        return row ? `${row.coldMs} / ${row.warmMs} ms`.padStart(22) : "—".padStart(22);
      })
      .join("");
    console.log(variant.padEnd(20) + cells);
  }
  console.log(`\nwrote ${path.relative(repoRoot, file)}`);
}

main();
