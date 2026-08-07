#!/usr/bin/env node
/**
 * Per-route JavaScript weight, measured in the browser.
 *
 * Static analysis of the import graph does not work across these variants:
 * Kudzu emits a static ESM closure, Next preloads route chunks with script
 * tags, and Astro discovers its island runtime through a dynamic `import()`
 * inside inline bootstrap code. A crawler tuned to one of them silently
 * under-reports the others — an earlier pass put Astro at 1.8 KB when the
 * real figure is ~60 KB.
 *
 * So this loads each route in a real browser and records every JavaScript
 * response the page actually fetches, plus the inline module bodies in the
 * document. That is framework-agnostic by construction.
 *
 * Usage:
 *   node scripts/shop-assets.mjs
 *   node scripts/shop-assets.mjs --variants shop-kudzu,shop-astro
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const BASE_PATH = "/ones-to-watch-refactor-test";

const ROUTES = {
  home: "/",
  search: "/search/",
  collection: "/search/outerwear/",
  product: "/product/p-00000/",
  policy: "/shipping/",
  checkout: "/checkout/"
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

function parseArgs(argv) {
  const options = {
    variants: ["shop-kudzu", "shop-astro", "shop-react-router", "shop-tanstack", "shop-next-app"],
    out: "bench"
  };
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--variants") options.variants = argv[++index].split(",");
    else if (argv[index] === "--out") options.out = argv[++index];
    else throw new Error(`unknown flag ${argv[index]}`);
  }
  return options;
}

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
    let file = path.join(distDir, pathname.slice(prefix.length).replace(/^\/+/, ""));
    if (!file.startsWith(distDir)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

/** Total output bytes and file count, images excluded so variants compare. */
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

async function measureRoute(browser, origin, variant, route) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const bodies = [];

  page.on("response", async response => {
    const type = response.headers()["content-type"] ?? "";
    if (!type.includes("javascript")) return;
    try {
      bodies.push(await response.body());
    } catch {
      // Response body already discarded; ignore rather than fail the run.
    }
  });

  await page.goto(`${origin}${BASE_PATH}/${variant}${route}`, { waitUntil: "networkidle" });
  // Islands and route chunks can be requested after networkidle settles once.
  await page.waitForTimeout(600);

  const inline = await page.evaluate(() =>
    [...document.querySelectorAll("script:not([src])")].map(node => node.textContent ?? "")
  );
  const html = await page.evaluate(() => document.documentElement.outerHTML.length);

  await context.close();

  const buffers = [...bodies, ...inline.map(text => Buffer.from(text))];
  const raw = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  return {
    requests: bodies.length,
    raw,
    gzip: raw ? gzipSync(Buffer.concat(buffers), { level: 9 }).length : 0,
    html
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch();
  const report = { measuredAt: new Date().toISOString(), variants: {} };

  try {
    for (const variant of options.variants) {
      const distDir = ["dist", "out", "build/client"]
        .map(name => path.join(repoRoot, "apps", variant, name))
        .find(existsSync);
      if (!distDir) {
        console.log(`${variant}: no build output — skipped`);
        continue;
      }

      const { server, port } = await startServer(distDir, variant);
      const origin = `http://127.0.0.1:${port}`;
      const routes = {};
      for (const [label, route] of Object.entries(ROUTES)) {
        routes[label] = await measureRoute(browser, origin, variant, route);
      }
      server.close();

      report.variants[variant] = { output: measureOutput(distDir), routes };
      console.log(`${variant}: measured ${Object.keys(routes).length} routes`);
    }
  } finally {
    await browser.close();
  }

  mkdirSync(path.join(repoRoot, options.out), { recursive: true });
  const file = path.join(repoRoot, options.out, "shop-assets.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

  const labels = Object.keys(ROUTES);
  console.log("\n라우트별 초기 JavaScript (KB gzip, 브라우저가 실제로 받은 것)\n");
  console.log("variant".padEnd(20) + labels.map(label => label.padStart(11)).join("") + "총 출력".padStart(14));
  for (const [variant, data] of Object.entries(report.variants)) {
    const cells = labels.map(label => `${(data.routes[label].gzip / 1024).toFixed(1)}`.padStart(11)).join("");
    const size = `${(data.output.bytes / 1048576).toFixed(2)} MB`.padStart(12);
    console.log(variant.replace("shop-", "").padEnd(20) + cells + size);
  }
  console.log(`\nwrote ${path.relative(repoRoot, file)}`);
}

await main();
