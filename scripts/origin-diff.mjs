#!/usr/bin/env node
// Pixel-diffs the four framework variants against the LIVE origin site
// (https://ones-to-watch.ethansup.net) — the origin is an Astro SSR app
// backed by an R2 binding, so it cannot be built or served locally; this
// script always hits the real deployment for the "origin" side.
//
// By default the "candidate" side is also the live deployment (GitHub
// Pages: https://simyunsup.github.io/kudzu-based-bench/...), so
// this compares two real, currently-deployed sites. Pass --target to point
// the candidate side at a different base origin instead (e.g. a locally
// served `site/` artifact from scripts/lib/site-server.mjs#startServer) —
// the origin side is unaffected by --target.
//
// Usage:
//   node ./scripts/origin-diff.mjs                       # origin vs deployed Pages
//   node ./scripts/origin-diff.mjs --target http://127.0.0.1:PORT
//
// This is an informational report, not a CI gate: unlike visual-diff.mjs,
// it never exits non-zero for diff ratios OR capture failures (both sides
// are external network dependencies outside this repo's control) — a
// failed capture is just reported as "-" in its row.
//
// Deps: playwright, pixelmatch, pngjs (see package.json devDependencies) —
// same set visual-diff.mjs already uses, no new devDependency required.
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_PATH, VARIANTS } from "./lib/site-server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const originDiffDir = path.join(repoRoot, "origin-diff");

// The live origin site — Astro SSR + Cloudflare R2, no local build path.
// Its routes are NOT base-path-prefixed (unlike the deployed Pages variants,
// which live under BASE_PATH from scripts/lib/site-server.mjs).
const ORIGIN_BASE_URL = "https://ones-to-watch.ethansup.net";
const ORIGIN_PATHS = { home: "/home", archive: "/news/list/1" };

// Default candidate origin: the deployed GitHub Pages site. --target
// overrides this (e.g. for a locally served build) but the origin side
// above is always the live deployment regardless.
const DEFAULT_TARGET_ORIGIN = "https://simyunsup.github.io";

const PAGES = [
  { key: "home", label: "Home" },
  { key: "archive", label: "Archive (news/list/1)" },
];

const PIXELMATCH_THRESHOLD = 0.2;
const CAPTURE_ATTEMPTS = 2; // 1 initial try + 1 retry, both sides are network-dependent

// Every image request is blocked on BOTH sides regardless of hostname —
// origin thumbnails come from a CDN, variant thumbnails from presigned S3
// URLs, so leaving images in would make every diff dominated by unrelated
// URL/asset churn instead of actual layout/text differences. The two
// hostname lists below are a belt-and-suspenders backstop for the (rare)
// thumbnail request that Playwright doesn't classify as resourceType
// "image" — e.g. a `fetch()`-loaded cover image.
const BLOCKED_IMAGE_HOSTNAMES = [
  "cdn-otw.ethansup.net", // origin thumbnail CDN
  "amazonaws.com", // presigned S3 URLs used for variant thumbnails
];

// Third-party embeds/scripts blocked on both sides so the diff reflects
// page layout/text, not whether a beacon or subscribe-form iframe happened
// to load: kit.com is the origin-only newsletter subscribe-form iframe,
// googletagmanager.com/cloudflareinsights.com (incl. the
// static.cloudflareinsights.com beacon script) are origin-only analytics.
const BLOCKED_THIRD_PARTY_HOSTNAMES = [
  "kit.com",
  "googletagmanager.com",
  "cloudflareinsights.com",
  "static.cloudflareinsights.com",
];

// Font CDNs (fonts.googleapis.com, fonts.gstatic.com, cdn.jsdelivr.net,
// tetunori.github.io) are deliberately left OFF every blocklist above and
// allowed to load on both sides — same condition for origin and variants.

function parseArgs(argv) {
  const args = { target: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--target") {
      args.target = argv[++i];
    }
  }
  return args;
}

function matchesHostname(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/** Abort image requests and known third-party embeds/analytics on both the
 * origin and candidate pages, so the two sides are captured under
 * identical network conditions and the diff isolates layout/text
 * differences rather than differing thumbnail/embed URLs. */
async function applyFairBlocking(page) {
  await page.route("**/*", (route) => {
    const request = route.request();
    // Never abort the page's own top-level navigation — only subframe
    // navigations (e.g. the kit.com subscribe-form iframe) and subresources
    // are candidates for blocking below.
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      return route.continue();
    }
    let hostname;
    try {
      hostname = new URL(request.url()).hostname;
    } catch {
      return route.continue();
    }
    const blocked =
      request.resourceType() === "image" ||
      BLOCKED_IMAGE_HOSTNAMES.some((domain) => matchesHostname(hostname, domain)) ||
      BLOCKED_THIRD_PARTY_HOSTNAMES.some((domain) => matchesHostname(hostname, domain));
    return blocked ? route.abort() : route.continue();
  });
}

/** Wait for web fonts to finish loading (bounded — some pages may never
 * settle document.fonts.ready, so don't block screenshot capture forever). */
async function waitForFonts(page) {
  await page.evaluate(() => {
    if (!("fonts" in document)) return undefined;
    return Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  });
}

/** Capture a full-page screenshot of `url` to `outPath` under identical,
 * animation-free, font-settled conditions. Retries once on any failure
 * (navigation timeout, network error) since both origin and candidate are
 * live external deployments. Returns `{ path, error }`. */
async function captureWithRetry(context, url, outPath, label) {
  let lastError = null;
  for (let attempt = 1; attempt <= CAPTURE_ATTEMPTS; attempt++) {
    const page = await context.newPage();
    try {
      await applyFairBlocking(page);
      // colorScheme is also set at context level; emulateMedia reinforces
      // it per-page and pins reduced-motion for animation stability.
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await page.goto(url, { waitUntil: "load", timeout: 30_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 });
      // Belt-and-suspenders on top of reducedMotion: force-kill any
      // animation/transition still running so a mid-transition frame never
      // gets captured.
      await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
      await waitForFonts(page);
      await page.screenshot({ path: outPath, fullPage: true });
      return { path: outPath, error: null };
    } catch (err) {
      lastError = err;
      console.error(`origin-diff: attempt ${attempt}/${CAPTURE_ATTEMPTS} FAILED ${label}: ${err.message}`);
    } finally {
      await page.close();
    }
  }
  return { path: null, error: lastError?.message ?? "unknown error" };
}

function loadPng(filePath) {
  return PNG.sync.read(readFileSync(filePath));
}

/** Copy the top-left `width`×`height` region of `png` into a new PNG, used
 * to compare a common area when origin and candidate screenshots differ in
 * size. Ported from scripts/visual-diff.mjs (not exported there). */
function cropTopLeft(png, width, height) {
  const cropped = new PNG({ width, height });
  const srcRowBytes = png.width * 4;
  const destRowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcStart = y * srcRowBytes;
    const destStart = y * destRowBytes;
    for (let i = 0; i < destRowBytes; i++) {
      cropped.data[destStart + i] = png.data[srcStart + i];
    }
  }
  return cropped;
}

/** Pixel-diff `candidatePath` against `originPath`, writing a diff PNG to
 * `diffOutPath`. Falls back to comparing only the shared top-left region
 * when dimensions differ, and reports that mismatch (plus the height
 * delta) separately. Ported from scripts/visual-diff.mjs (not exported
 * there). */
function diffImages(originPath, candidatePath, diffOutPath) {
  const origin = loadPng(originPath);
  const candidate = loadPng(candidatePath);
  const sizeMismatch = origin.width !== candidate.width || origin.height !== candidate.height;
  const width = Math.min(origin.width, candidate.width);
  const height = Math.min(origin.height, candidate.height);
  const a = sizeMismatch ? cropTopLeft(origin, width, height) : origin;
  const b = sizeMismatch ? cropTopLeft(candidate, width, height) : candidate;

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD,
  });
  writeFileSync(diffOutPath, PNG.sync.write(diff));

  return {
    diffPixels,
    ratio: diffPixels / (width * height),
    sizeMismatch,
    heightDelta: candidate.height - origin.height,
    candidateSize: { width: candidate.width, height: candidate.height },
    comparedSize: { width, height },
  };
}

function formatPercent(ratio) {
  return `${(ratio * 100).toFixed(3)}%`;
}

function buildSummaryMarkdown(pageResults, targetOrigin) {
  const lines = [
    "# Origin diff summary",
    "",
    `_Origin: ${ORIGIN_BASE_URL}. Candidate base: ${targetOrigin}. Generated: ${new Date().toISOString()}_`,
    "",
  ];

  for (const page of pageResults) {
    lines.push(`## ${page.label}`, "");
    if (page.originError) {
      lines.push(`⚠️ origin screenshot failed: ${page.originError}`, "");
      continue;
    }
    lines.push(`Origin size: ${page.originSize.width}×${page.originSize.height}px`, "");
    lines.push("| 변형 | 크기 | Diff 픽셀 | Diff 비율 | 비고 |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const row of page.rows) {
      if (row.error) {
        lines.push(`| ${row.variant} | - | - | - | ❌ ${row.error} |`);
        continue;
      }
      const notes = [];
      if (row.sizeMismatch) {
        notes.push(
          `크기 불일치 (공통 영역 ${row.comparedSize.width}×${row.comparedSize.height}px만 비교, 높이차 ${row.heightDelta >= 0 ? "+" : ""}${row.heightDelta}px)`,
        );
      }
      lines.push(
        `| ${row.variant} | ${row.candidateSize.width}×${row.candidateSize.height}px | ${row.diffPixels} | ${formatPercent(row.ratio)} | ${notes.length > 0 ? notes.join("; ") : "-"} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## 각주",
    "",
    "- 이 리포트는 이미지(resourceType `image`) 및 아래 도메인을 양쪽 모두 차단한 상태에서 캡처한 " +
      "레이아웃/텍스트 비교입니다: 썸네일 CDN·S3(`cdn-otw.ethansup.net`, `*.amazonaws.com`), " +
      "구독폼/분석 스크립트(`kit.com`, `googletagmanager.com`, `cloudflareinsights.com`, " +
      "`static.cloudflareinsights.com`). 폰트 CDN(`fonts.googleapis.com`, `cdn.jsdelivr.net` 등)은 " +
      "양쪽 모두 허용했습니다.",
    "- 원본에만 있는 뉴스레터 구독폼(kit.com iframe, 차단되어 빈 영역/높이 차이로 나타날 수 있음)과 " +
      "리팩토링 변형에만 있는 푸터 variant-switcher 때문에 구조적 diff가 일부 존재하는 것은 예상된 결과입니다.",
    "- Diff 비율은 정보 제공용이며 이 스크립트는 diff 비율이나 캡처 실패로 인해 종료 코드 1을 반환하지 않습니다 " +
      "(양쪽 모두 이 레포 밖의 라이브 배포에 대한 네트워크 의존이기 때문). 캡처 실패 시 해당 행은 `-`로 표시됩니다.",
    "",
  );

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetOrigin = args.target ?? DEFAULT_TARGET_ORIGIN;

  rmSync(originDiffDir, { recursive: true, force: true });
  const screenshotsDir = path.join(originDiffDir, "screenshots");
  const diffsDir = path.join(originDiffDir, "diffs");
  mkdirSync(path.join(screenshotsDir, "origin"), { recursive: true });
  for (const variant of VARIANTS) {
    mkdirSync(path.join(screenshotsDir, variant.key), { recursive: true });
    mkdirSync(path.join(diffsDir, variant.key), { recursive: true });
  }

  console.log(`origin-diff: origin=${ORIGIN_BASE_URL} target=${targetOrigin}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  });

  const originShots = {};
  const candidateShots = {};

  try {
    for (const page of PAGES) {
      const originUrl = `${ORIGIN_BASE_URL}${ORIGIN_PATHS[page.key]}`;
      const originOutPath = path.join(screenshotsDir, "origin", `${page.key}.png`);
      originShots[page.key] = await captureWithRetry(context, originUrl, originOutPath, `origin/${page.key}`);
      if (originShots[page.key].error) {
        console.error(`origin-diff: FAILED origin/${page.key}: ${originShots[page.key].error}`);
      } else {
        console.log(`origin-diff: captured origin/${page.key}`);
      }

      candidateShots[page.key] = {};
      for (const variant of VARIANTS) {
        const candidateUrl = `${targetOrigin}${BASE_PATH}${variant.paths[page.key]}`;
        const outPath = path.join(screenshotsDir, variant.key, `${page.key}.png`);
        const label = `${variant.key}/${page.key}`;
        candidateShots[page.key][variant.key] = await captureWithRetry(context, candidateUrl, outPath, label);
        if (candidateShots[page.key][variant.key].error) {
          console.error(`origin-diff: FAILED ${label}: ${candidateShots[page.key][variant.key].error}`);
        } else {
          console.log(`origin-diff: captured ${label}`);
        }
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const pageResults = [];
  for (const page of PAGES) {
    const origin = originShots[page.key];
    const result = {
      label: page.label,
      originError: origin.error,
      originSize: null,
      rows: [],
    };
    if (!origin.error) {
      const originPng = loadPng(origin.path);
      result.originSize = { width: originPng.width, height: originPng.height };
    }

    for (const variant of VARIANTS) {
      const shot = candidateShots[page.key][variant.key];
      if (origin.error) {
        result.rows.push({ variant: variant.label, error: "origin screenshot failed" });
        continue;
      }
      if (shot.error) {
        result.rows.push({ variant: variant.label, error: shot.error });
        continue;
      }
      const diffOutPath = path.join(diffsDir, variant.key, `${page.key}.png`);
      const diff = diffImages(origin.path, shot.path, diffOutPath);
      result.rows.push({ variant: variant.label, ...diff });
    }
    pageResults.push(result);
  }

  const summaryMd = buildSummaryMarkdown(pageResults, targetOrigin);
  console.log(summaryMd);
  await writeFile(path.join(originDiffDir, "summary.md"), summaryMd);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${summaryMd}\n`);
  }

  // Informational report only — never fail the build on diff ratio or a
  // flaky external capture (see header comment).
}

await main();
