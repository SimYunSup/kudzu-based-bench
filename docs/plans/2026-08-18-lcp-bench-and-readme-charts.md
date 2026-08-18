# LCP 벤치마크 + README 차트 Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LCP를 실제로 측정하는 벤치(`scripts/lcp-bench.mjs`)를 추가하고, 커밋된 데이터에서 SVG 막대 그래프를 생성해(`scripts/charts.mjs`) README.md·README.en.md의 메인 벤치마크를 그래프로 보여준다.

**Architecture:** 벤치는 기존 `scripts/shop-bench.mjs`·`docs-bench.mjs` 관례를 그대로 따른다 — 변형별 정적 출력을 `BASE_PATH/<variant>` 아래로 서빙하는 자체 HTTP 서버, Chrome "Slow 4G" + 4x CPU 스로틀, 외부 CDP 폴링 대신 in-page 측정. 측정 결과는 `landing/lcp.json`(커밋됨, `landing/benchmark.json`·`commerce.json`과 같은 역할)으로 발행하고, README에는 `build-stats.mjs`와 동일한 마커 주입 방식으로 표를 넣는다. 차트 생성기는 **커밋된 `landing/*.json`만** 읽어 `assets/charts/*.svg`를 만들므로 클론한 사람이 그대로 재생성할 수 있다.

**Tech Stack:** Node 24 ESM 스크립트, Playwright(`chromium`), `PerformanceObserver('largest-contentful-paint')`, 손으로 쓰는 SVG(외부 차트 라이브러리 없음 — 의존성 추가 금지), GitHub 마크다운의 상대경로 `<img>`.

**Spec:** 이 문서의 [Spec](#spec) 절 (별도 스펙 문서 없음 — 요청과 그 근거를 여기 옮겨 적는다).

## Spec

원 질문(외부 독자): *"That's a solid multi-framework benchmark. Did you measure bundle size or LCP differences across them? Would be great to see the repo."*

요구사항:

1. **번들 크기** — 이미 측정·게시됨(`README` 뉴스레터 표의 `JS 크기`, 커머스 `라우트별 초기 JavaScript`, `세션 총 전송`). 새로 잴 것은 없고 그래프로만 보이면 된다.
2. **LCP** — 지금까지 게시하지 않았다. 이유를 README에 **주장으로만 남기지 말고 실측으로** 뒷받침한다: LCP를 재는 벤치를 새로 파고, 그 수치가 프레임워크에 대해 무엇을 말하고 무엇을 못 말하는지 데이터로 보여준다.
3. **그래프** — `home-butler`의 `DESIGN.md`(Linear 다크 캔버스 디자인 시스템)를 참고해 메인 벤치마크를 막대 그래프로 README.md에 게시한다.
4. README.md(한국어)와 README.en.md(영어)는 항상 같은 내용을 담는다 — 이 레포의 기존 규칙.

## Global Constraints

- `BASE_PATH = "/kudzu-based-bench"` — 모든 변형의 빌드가 이 prefix 아래 라우트로 생성되어 있다. 서버는 이 prefix를 벗겨 `apps/<variant>/<dist>`에 매핑한다.
- 스로틀 기본값: `4x CPU`, `slow4g` = `{ latency: 150 ms, download: 1.6 Mbps/8, upload: 750 Kbps/8 }`. `fast4g` = `{ 40, 9 Mbps/8, 1.5 Mbps/8 }`. Chrome DevTools 프리셋과 동일한 숫자를 쓴다.
- 형제 벤치 스크립트끼리 **import 하지 않는다**. `shop-bench.mjs`는 export가 없는 스크립트이고, `docs-bench.mjs`는 "서빙/스로틀 관례를 import 없이 재현한다"고 주석에 명시했다. 새 스크립트도 자체 복사본을 갖는다. (공유해도 되는 것은 `scripts/lib/`에 있는 것뿐이다.)
- 새 런타임 의존성 금지. devDependencies도 추가하지 않는다(`playwright`는 이미 있다).
- `bench/`는 `.gitignore`에 있다 → 커밋해야 하는 데이터는 `landing/`에, 커밋해야 하는 이미지는 `assets/`에 둔다.
- 중앙값 규칙: 워밍업 1회를 버리고 N회의 중앙값. 회차별 원본값을 JSON에 함께 싣는다(`landing/benchmark.json`의 `coldSamples` 관례).
- 측정 머신 스펙을 JSON에 기록한다. `build-stats.mjs`와 동일 포맷: `` `${cpuModel} · ${cpus.length}코어 · RAM ${totalGiB} GB · ${platform}/${arch} · Node ${version}` ``(ko) / `` `… · ${cpus.length} cores · ${totalGiB} GB RAM · …` ``(en).
- SVG는 자체 완결이어야 한다: `<style>` 블록·CSS 클래스·외부 폰트 금지(GitHub의 SVG 렌더링에서 살아남지 못한다). 색·폰트는 전부 presentation attribute로 쓴다.
- 디자인 토큰은 `home-butler/DESIGN.md`의 값을 그대로 쓴다: canvas `#010102`, surface-1 `#0f1011`, surface-2 `#141516`, hairline `#23252a`, hairline-tertiary `#3e3e44`, ink `#f7f8f8`, ink-muted `#d0d6e0`, ink-subtle `#8a8f98`, ink-tertiary `#62666d`, primary `#5e6ad2`, brand-secure `#7a7fad`, success `#27a644`. rounded xs 4 / md 8 / lg 12. spacing 4·8·12·16·24·32·48.
- 강조색(`#5e6ad2`)은 장식으로 쓰지 않는다(DESIGN.md 원칙). 단일 시리즈 차트에서는 **최고 성적 막대 하나**에만, 다중 시리즈 차트에서는 **시리즈 구분**에만 쓴다.
- README 두 파일 모두 수정. 한국어 README가 기준이고 영어는 같은 구조·같은 수치.
- PR 생성 금지(레포 규칙). 브랜치 커밋까지만.

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `scripts/lcp-bench.mjs` (신규, ~330줄) | 세 결정론 픽스처(커머스·문서·폼)의 진입 라우트에서 FCP/LCP/LCP 요소/LCP 자원 바이트를 측정 → `landing/lcp.json` 발행 + README 표 주입. |
| `scripts/charts.mjs` (신규, ~420줄) | `landing/{benchmark,commerce,lcp}.json` → `assets/charts/*.svg` 7종. Linear 토큰 하드코딩 + 수평 막대/그룹 막대/세그먼트 막대 프리미티브. |
| `landing/lcp.json` (신규, 생성물) | 발행된 LCP 측정치. `landing/commerce.json`과 같은 역할. |
| `assets/charts/*.svg` (신규, 생성물 7개) | README가 참조하는 그래프. |
| `README.md` (수정) | `## 한눈에 보기` 차트 절 추가, 커머스 절에 `### LCP` 추가(+ 마커), 검증 도구 목록에 두 스크립트 추가. |
| `README.en.md` (수정) | 위와 동일 구조의 영어판. |
| `package.json` (수정) | `"lcp:bench"`, `"charts"` 스크립트 추가. |

측정 대상(전부 빌드 완료 확인됨):

- 커머스 5: `shop-kudzu`, `shop-astro`, `shop-react-router`, `shop-tanstack`, `shop-next-app`
- 문서 5: `docs-kudzu`, `docs-astro`, `docs-eleventy`, `docs-docusaurus`, `docs-vitepress`
- 폼 5: `form-kudzu`, `form-astro`, `form-react-router`, `form-tanstack`, `form-next-app`

뉴스레터 10변형은 LCP 대상이 아니다 — 홈의 최대 요소가 Notion 이미지이고 변형마다 이미지 파이프라인(Astro `sharp`, Next `unoptimized`, Hugo 원본 복사 등)이 달라 프레임워크 렌더링이 아니라 **이미지 처리**를 재게 된다. 이 사실 자체는 README에 한 줄로 적고, 뉴스레터의 Lighthouse LCP는 기존 `pnpm run perf:bench`가 이미 낸다는 점을 가리킨다.

---

### Task 1: LCP 측정 하네스

**Files:**
- Create: `scripts/lcp-bench.mjs`
- Modify: `package.json:29-31` (scripts 블록 끝에 `lcp:bench` 추가)

**Interfaces:**
- Consumes: 없음(자체 완결 스크립트). 문서 픽스처의 진입 경로만 `packages/docs-data/dist/index.js`의 `getDocs()`에서 **동적 import**로 얻는다(`docs-bench.mjs:148-155`와 같은 규칙: `section === "routing"`인 페이지 중 index 1).
- Produces: `landing/lcp.json`. 스키마(Task 3의 `charts.mjs`가 이 이름들을 그대로 읽는다):

```js
{
  measuredAt: "2026-08-18T…Z",
  runs: 5,
  throttling: { cpu: "4x", network: "slow4g" },   // 또는 "none"
  machine: { ko: "Apple M4 · 10코어 · …", en: "Apple M4 · 10 cores · …" },
  rows: [
    {
      fixture: "shop",                 // "shop" | "docs" | "form"
      fixtureLabel: { ko: "커머스", en: "Commerce" },
      variant: "shop-kudzu",
      label: "Kudzu",
      route: "product",                // 픽스처별 라우트 키
      routeLabel: { ko: "상품 상세", en: "Product" },
      path: "/product/p-00000/",
      fcpMs: 168.4,
      lcpMs: 421.7,
      lcpSamples: [420.1, 421.7, 425.0, 419.8, 430.2],
      lcpDeltaFcpMs: 253.3,            // median(lcp - fcp) — 같은 회차 내 차이
      lcpKind: "image",                // "image" | "text"
      lcpElement: "img.tile-image",
      lcpUrl: "/kudzu-based-bench/shop-kudzu/commerce/p-00.png",
      lcpBytes: 22564,                 // encodedBodySize, 텍스트 LCP면 null
      lcpCandidates: 2,                // LCP 후보 개수 중앙값
      lcpFirstCandidateMs: 168.4       // 첫 후보 시점 중앙값 — 후보가 뒤로 밀렸는지 확인용
    }
  ]
}
```

- [ ] **Step 1: 스크립트 골격 + 헤더 주석**

`scripts/lcp-bench.mjs` 상단. 주석은 이 벤치가 왜 존재하는지(= 외부 질문에 대한 답)와 무엇을 재지 않는지를 명시한다.

```js
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
 *     14x slower to become interactive scores the same LCP.
 *   - Docs LCP is text, and there the spread is real: a variant that
 *     re-renders its article body after hydration pushes its own LCP out.
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
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
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
const DIST_CANDIDATES = ["dist", "out", path.join("build", "client"), "build", "_site", path.join(".vitepress", "dist")];
```

- [ ] **Step 2: 픽스처 레지스트리와 인자 파싱**

```js
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
  const options = { fixture: null, variant: null, runs: 5, cpu: 4, net: "slow4g", throttle: true, readme: true };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--fixture") options.fixture = argv[++index];
    else if (flag === "--variant") options.variant = argv[++index];
    else if (flag === "--runs") options.runs = Number(argv[++index]);
    else if (flag === "--cpu") options.cpu = Number(argv[++index]);
    else if (flag === "--net") options.net = argv[++index];
    else if (flag === "--no-throttle") options.throttle = false;
    else if (flag === "--skip-readme") options.readme = false;
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!NETWORK[options.net]) throw new Error(`--net must be one of ${Object.keys(NETWORK).join(", ")}`);
  if (options.fixture && !FIXTURES[options.fixture]) throw new Error(`--fixture must be one of ${Object.keys(FIXTURES).join(", ")}`);
  return options;
}
```

- [ ] **Step 3: 서버 + 스로틀 (shop-bench.mjs와 동일한 계약)**

`shop-bench.mjs:137-188`을 그대로 옮긴다. 헤더도 동일(`cache-control: public, max-age=3600`), 컨텍스트마다 새 캐시라 무의미하지만 변형 간 조건을 같게 유지한다.

```js
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
}
```

- [ ] **Step 4: LCP 프로브 (in-page)**

핵심. `buffered: true`로 이미 지나간 후보까지 받고, **마지막 후보**를 LCP로 채택한다. 종료 조건은 `readyState === "complete"` + 후보 무변화 `settleMs`, 상한 `budgetMs`. 하이드레이션이 본문을 다시 그려 후보가 뒤로 밀리는 경우를 놓치지 않기 위해 `load` 이후에도 기다린다.

> 주의: 이 문자열은 바깥 파일의 템플릿 리터럴 안에 들어간다. 정규식의 `\s`는 반드시 `\\s`로 쓴다(템플릿 리터럴이 `\s`를 `s`로 먹는다).

```js
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

  const finish = () => {
    observer.disconnect();
    const paint = performance.getEntriesByName("first-contentful-paint")[0];
    const navigation = performance.getEntriesByType("navigation")[0];
    const last = candidates[candidates.length - 1] ?? null;
    const resource = last && last.url ? performance.getEntriesByName(new URL(last.url, location.href).href)[0] : null;
    resolve({
      fcpMs: paint ? +paint.startTime.toFixed(1) : null,
      loadEventMs: navigation && navigation.loadEventEnd ? +navigation.loadEventEnd.toFixed(1) : null,
      candidates,
      lcp: last,
      // encodedBodySize is same-origin here, so no Timing-Allow-Origin dance.
      lcpBytes: resource ? resource.encodedBodySize || resource.transferSize || null : null
    });
  };

  const tick = () => {
    if (performance.now() >= budgetMs) return finish();
    if (document.readyState === "complete" && performance.now() - lastCandidateAt >= settleMs) return finish();
    setTimeout(tick, 100);
  };
  tick();
})`;
```

- [ ] **Step 5: 한 회차 실행**

입력을 절대 만들지 않는다(클릭·스크롤·키 입력은 LCP를 즉시 확정시킨다). `waitUntil: "commit"`으로 문서가 열리는 즉시 프로브를 심는다.

```js
/**
 * One load in a fresh context. No interaction of any kind: the first
 * click, keypress or scroll freezes LCP, so an interacting harness would
 * report whatever it happened to interrupt.
 */
async function runLoad(browser, origin, variant, route, options) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await applyThrottling(page, options);
  try {
    await page.goto(`${origin}${BASE_PATH}/${variant}${route.path}`, { waitUntil: "commit" });
    const sample = await page.evaluate(`(${LCP_PROBE})(1500, 30000)`);
    if (!sample.lcp) throw new Error(`${variant} ${route.path}: no LCP candidate within 30000 ms`);
    return sample;
  } finally {
    await context.close();
  }
}

const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
```

- [ ] **Step 6: 변형 단위 집계**

```js
async function benchVariant(browser, fixtureKey, fixture, variant, routes, options) {
  const distDir = DIST_CANDIDATES.map(name => path.join(repoRoot, "apps", variant, name)).find(existsSync);
  if (!distDir) throw new Error(`no build output under apps/${variant} — build the variant first`);

  const { server, port } = await startServer(distDir, variant);
  const origin = `http://127.0.0.1:${port}`;
  const rows = [];
  try {
    for (const route of routes) {
      // One discarded warm-up: the first load of a variant pays for page
      // compilation and disk cache warming that no repeat load pays.
      await runLoad(browser, origin, variant, route, options);

      const samples = [];
      for (let run = 0; run < options.runs; run++) samples.push(await runLoad(browser, origin, variant, route, options));

      const last = samples[samples.length - 1];
      rows.push({
        fixture: fixtureKey,
        fixtureLabel: fixture.label,
        variant,
        label: labelFor(variant),
        route: route.key,
        routeLabel: route.label,
        path: route.path,
        fcpMs: +median(samples.map(sample => sample.fcpMs)).toFixed(1),
        lcpMs: +median(samples.map(sample => sample.lcp.ms)).toFixed(1),
        lcpSamples: samples.map(sample => sample.lcp.ms),
        lcpDeltaFcpMs: +median(samples.map(sample => sample.lcp.ms - sample.fcpMs)).toFixed(1),
        lcpKind: last.lcp.url ? "image" : "text",
        lcpElement: last.lcp.element,
        lcpUrl: last.lcp.url,
        lcpBytes: last.lcpBytes,
        lcpCandidates: median(samples.map(sample => sample.candidates.length)),
        lcpFirstCandidateMs: +median(samples.map(sample => sample.candidates[0].ms)).toFixed(1)
      });
      console.log(
        `  ${route.key.padEnd(8)} FCP ${String(rows.at(-1).fcpMs).padStart(7)} ms   LCP ${String(rows.at(-1).lcpMs).padStart(7)} ms   ` +
        `${rows.at(-1).lcpKind} ${rows.at(-1).lcpElement}${rows.at(-1).lcpBytes ? ` (${(rows.at(-1).lcpBytes / 1024).toFixed(1)} KB)` : ""}`
      );
    }
  } finally {
    server.close();
  }
  return rows;
}
```

- [ ] **Step 7: main — 실행, JSON 발행, 콘솔 요약**

```js
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixtureKeys = options.fixture ? [options.fixture] : Object.keys(FIXTURES);
  const browser = await chromium.launch();
  const rows = [];
  const failures = [];

  try {
    for (const key of fixtureKeys) {
      const fixture = FIXTURES[key];
      const routes = await fixture.routes();
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

  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model?.replace(/\s+/g, " ").trim() ?? "unknown CPU";
  const totalGiB = Math.round(os.totalmem() / 1024 ** 3);
  const report = {
    measuredAt: new Date().toISOString(),
    runs: options.runs,
    throttling: options.throttle ? { cpu: `${options.cpu}x`, network: options.net } : "none",
    machine: {
      ko: `${cpuModel} · ${cpus.length}코어 · RAM ${totalGiB} GB · ${process.platform}/${process.arch} · Node ${process.version}`,
      en: `${cpuModel} · ${cpus.length} cores · ${totalGiB} GB RAM · ${process.platform}/${process.arch} · Node ${process.version}`
    },
    rows
  };
  mkdirSync(path.join(repoRoot, "landing"), { recursive: true });
  writeFileSync(path.join(repoRoot, "landing", "lcp.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nwrote landing/lcp.json (${rows.length} rows)`);
  if (options.readme) await injectReadmeTables(report);
  if (failures.length) {
    for (const failure of failures) console.error(`FAILED ${failure.variant}: ${failure.message}`);
    process.exitCode = 1;
  }
}

await main();
```

- [ ] **Step 8: 폼 픽스처로 스모크 (2회차)**

Run: `node scripts/lcp-bench.mjs --fixture form --runs 2 --skip-readme`
Expected: 5개 변형 각각 `step1 FCP … LCP …` 한 줄, `wrote landing/lcp.json (5 rows)`. 실패 없음.

- [ ] **Step 9: 발행된 JSON 형태 확인**

Run: `jq -c '.rows[0], (.rows|length), .throttling' landing/lcp.json`
Expected: `lcpKind`가 `"text"`, `lcpMs`가 `fcpMs` 이상, `lcpSamples`에 2개, `throttling` = `{"cpu":"4x","network":"slow4g"}`.

- [ ] **Step 10: package.json에 스크립트 추가**

`"perf:bench"` 다음 줄에:

```json
    "lcp:bench": "node ./scripts/lcp-bench.mjs",
```

- [ ] **Step 11: 커밋**

```bash
git add scripts/lcp-bench.mjs package.json
git commit -m "feat(bench): LCP 측정 하네스 추가 — 후보 추적 + LCP 요소·자원 바이트"
```

---

### Task 2: LCP 표 주입 + 전체 측정

**Files:**
- Modify: `scripts/lcp-bench.mjs` (Step 7이 호출하는 `injectReadmeTables()` 구현)
- Modify: `README.md` (커머스 절 안에 `### LCP` + 마커)
- Modify: `README.en.md` (동일)
- Create(생성물): `landing/lcp.json` (실측값으로 갱신)

**Interfaces:**
- Consumes: Task 1의 `report` 객체(위 스키마).
- Produces: `<!-- lcp:start -->` … `<!-- lcp:end -->` 사이에 주입되는 마크다운 표. 마커는 `build-stats.mjs`의 `<!-- build-stats:start -->` 관례와 동일하게 동작한다(마커가 없으면 경고만 남기고 건너뛴다).

- [ ] **Step 1: 표 렌더러 + 주입기 구현**

`scripts/lcp-bench.mjs`에 추가. 행은 픽스처 → 라우트 → LCP 오름차순.

```js
const START_MARKER = "<!-- lcp:start -->";
const END_MARKER = "<!-- lcp:end -->";

const L = {
  ko: {
    header: "| 픽스처 | 라우트 | 변형 | FCP | LCP | LCP−FCP | LCP 요소 | LCP 자원 |",
    element: row => (row.lcpKind === "image" ? `이미지 \`${row.lcpElement}\`` : `텍스트 \`${row.lcpElement}\``),
    bytes: row => (row.lcpBytes === null ? "—" : `${(row.lcpBytes / 1024).toFixed(1)} KB`),
    footnote: report =>
      `_\`pnpm run lcp:bench\`로 로컬 측정(수동 갱신). 워밍업 1회를 버리고 ${report.runs}회를 잰 중앙값이며 회차별 원본값은 \`landing/lcp.json\`의 \`lcpSamples\`에 있습니다. ` +
      `브라우저 정의 그대로 \`PerformanceObserver('largest-contentful-paint')\`의 **마지막 후보**를 씁니다 — 하이드레이션이 본문을 다시 그려 후보가 뒤로 밀리면 그 값이 잡힙니다. ` +
      `하네스는 페이지를 클릭·스크롤하지 않습니다(첫 입력이 LCP를 확정시키므로). 4x CPU · ${report.throttling === "none" ? "무스로틀" : report.throttling.network} · 1280×900. ` +
      `측정 머신: ${report.machine.ko}. 측정 시각: ${report.measuredAt}_`
  },
  en: {
    header: "| Fixture | Route | Variant | FCP | LCP | LCP−FCP | LCP element | LCP resource |",
    element: row => (row.lcpKind === "image" ? `image \`${row.lcpElement}\`` : `text \`${row.lcpElement}\``),
    bytes: row => (row.lcpBytes === null ? "—" : `${(row.lcpBytes / 1024).toFixed(1)} KB`),
    footnote: report =>
      `_Measured locally via \`pnpm run lcp:bench\` (manual refresh). Median of ${report.runs} runs after one discarded warm-up; per-run values are in \`lcpSamples\` in \`landing/lcp.json\`. ` +
      `Uses the browser's own definition — the **final** \`PerformanceObserver('largest-contentful-paint')\` candidate, so a hydration re-render that pushes the candidate later shows up here. ` +
      `The harness never clicks or scrolls (the first input freezes LCP). 4x CPU · ${report.throttling === "none" ? "no throttling" : report.throttling.network} · 1280×900. ` +
      `Machine: ${report.machine.en}. Measured at ${report.measuredAt}_`
  }
};
const DIVIDER = "| --- | --- | --- | ---: | ---: | ---: | --- | ---: |";

function renderTable(report, lang) {
  const t = L[lang];
  const order = { shop: 0, docs: 1, form: 2 };
  const sorted = [...report.rows].sort(
    (left, right) =>
      order[left.fixture] - order[right.fixture] ||
      left.path.localeCompare(right.path) ||
      left.lcpMs - right.lcpMs
  );
  const rows = sorted.map(row =>
    `| ${row.fixtureLabel[lang]} | ${row.routeLabel[lang]} | ${row.label} | ${Math.round(row.fcpMs)} ms | ${Math.round(row.lcpMs)} ms | ` +
    `${Math.round(row.lcpDeltaFcpMs)} ms | ${t.element(row)} | ${t.bytes(row)} |`
  );
  return [t.header, DIVIDER, ...rows, "", t.footnote(report)].join("\n");
}

async function injectReadmeTables(report) {
  for (const [file, lang] of [["README.md", "ko"], ["README.en.md", "en"]]) {
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
```

- [ ] **Step 2: README 두 파일에 마커 자리 만들기**

`README.md`의 커머스 절 — `### 라우트별 초기 JavaScript (KB gzip)` **앞**에 다음을 넣는다(본문 산문은 Task 4에서 채운다. 지금은 마커가 주입 대상으로 존재하기만 하면 된다):

```markdown
### LCP

<details>
<summary>전 픽스처 · 전 라우트 LCP 측정치</summary>

<!-- lcp:start -->
<!-- lcp:end -->

</details>
```

`README.en.md`의 같은 위치에 영어 `<summary>LCP across every fixture and route</summary>`로 동일 구조.

- [ ] **Step 3: 전체 측정 실행 (15변형)**

Run: `node scripts/lcp-bench.mjs`
Expected: 커머스 5×3 + 문서 5 + 폼 5 = 25행, `wrote landing/lcp.json (25 rows)`, `README.md updated`, `README.en.md updated`. 실패 0.
소요: 변형·라우트당 (1+5)회 로드 × Slow 4G → 대략 15–25분. 백그라운드로 돌리고 로그를 확인한다.

- [ ] **Step 4: 결과 정합성 확인**

Run:
```bash
jq -r '.rows[] | select(.fixture=="shop" and .route=="product") | "\(.label)\t\(.lcpMs)\t\(.lcpKind)\t\(.lcpBytes)"' landing/lcp.json
jq -r '.rows[] | select(.fixture=="docs") | "\(.label)\t\(.fcpMs)\t\(.lcpMs)\t\(.lcpKind)\t\(.lcpCandidates)"' landing/lcp.json
```
Expected: 커머스 상품 상세는 다섯 변형 모두 `lcpKind == "image"`이고 `lcpBytes`가 동일(같은 PNG). 문서는 `lcpKind == "text"`이고 변형 간 `lcpMs` 차이가 커머스보다 뚜렷하다. 어느 행에도 `null` LCP가 없다.
확인 근거(사전 확인 완료): `apps/*/…/commerce/p-00.png`의 md5가 다섯 변형 모두 `9af370648cc94c368279f87de571afc0`.

- [ ] **Step 5: 커밋**

```bash
git add scripts/lcp-bench.mjs landing/lcp.json README.md README.en.md
git commit -m "feat(bench): LCP 실측 게시 — landing/lcp.json + README 표 주입"
```

---

### Task 3: 차트 생성기

**Files:**
- Create: `scripts/charts.mjs`
- Create(생성물): `assets/charts/{commerce-session,lcp-vs-actready,lcp-by-fixture,route-js,build-time,output-js,resilience}.svg`
- Modify: `package.json` (`"charts": "node ./scripts/charts.mjs"`)

**Interfaces:**
- Consumes: `landing/benchmark.json`(`rows[].{label,name,cold,warm,jsBytes}`), `landing/commerce.json`(`rows[].{label,entryContentReadyMs,listingActReadyMs,homeJsGzip,searchJsGzip,checkoutJsGzip,resilience,resilienceTotal,resilienceMax}`), `landing/lcp.json`(Task 1 스키마).
- Produces: SVG 파일들. README가 `<img src="assets/charts/<name>.svg">`로 참조한다.

- [ ] **Step 1: 헤더 주석 + 디자인 토큰**

```js
#!/usr/bin/env node
/**
 * README charts — hand-written SVG, no chart library.
 *
 * Reads only the published, committed measurements (landing/*.json), so
 * anyone who clones the repo can regenerate byte-identical charts without
 * re-running a single benchmark. Re-run after every bench that rewrites
 * one of those files:
 *
 *   pnpm run build:stats   -> landing/benchmark.json
 *   pnpm run shop:report   -> landing/commerce.json
 *   pnpm run lcp:bench     -> landing/lcp.json
 *   pnpm run charts        -> assets/charts/*.svg
 *
 * Design tokens are Linear's marketing system as captured in
 * home-butler/DESIGN.md: near-black canvas, four-step surface ladder,
 * hairline borders, and a single chromatic accent (#5e6ad2) that is never
 * decorative — here it marks the leading bar in a single-series chart and
 * distinguishes series in a grouped one.
 *
 * GitHub renders these through its image proxy, so everything is a
 * presentation attribute: no <style> block, no CSS classes, no web fonts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(repoRoot, "assets", "charts");

const T = {
  canvas: "#010102",
  surface1: "#0f1011",
  surface2: "#141516",
  hairline: "#23252a",
  hairlineStrong: "#34343a",
  bar: "#3e3e44",
  ink: "#f7f8f8",
  inkMuted: "#d0d6e0",
  inkSubtle: "#8a8f98",
  inkTertiary: "#62666d",
  accent: "#5e6ad2",
  accentSoft: "#7a7fad",
  success: "#27a644",
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Inter, Roboto, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace"
};
```

- [ ] **Step 2: SVG 프리미티브**

```js
const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const text = (x, y, value, { size = 13, fill = T.ink, weight = 400, family = T.sans, anchor = "start", tracking = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
  `${anchor === "start" ? "" : ` text-anchor="${anchor}"`}${tracking ? ` letter-spacing="${tracking}"` : ""}>${escape(value)}</text>`;

const rect = (x, y, width, height, { fill = T.bar, rx = 4, stroke = null } = {}) =>
  `<rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${height}" rx="${rx}" fill="${fill}"` +
  `${stroke ? ` stroke="${stroke}" stroke-width="1"` : ""}/>`;

const line = (x1, y1, x2, y2, stroke = T.hairline) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1"/>`;

/** Card frame + title block shared by every chart. Returns { body, top }. */
function frame({ width, height, title, eyebrow, legend = [], footnote = null }) { /* … Step 3 */ }
```

`frame()`은 다음을 그린다(모든 좌표는 spacing 토큰 배수):
- canvas 배경 `rect(0,0,width,height,{fill:T.canvas,rx:12})`
- surface-1 카드 `rect(1,1,width-2,height-2,{fill:T.surface1,rx:12,stroke:T.hairline})`
- eyebrow: `x=32,y=40`, 13px/500, `T.inkSubtle`, `tracking=0.4`, 대문자
- title: `x=32,y=72`, 22px/600, `T.ink`
- legend 칩: 우측 상단 `y=64`, 각 항목 `rect(x,y-9,10,10,{fill,rx:2})` + 13px `T.inkMuted` 라벨, 오른쪽 정렬로 배치
- footnote: `x=32, y=height-20`, 12px, `T.inkTertiary`

- [ ] **Step 3: 수평 막대 차트 (단일/그룹 공통)**

```js
/**
 * @param {{ label: string, values: number[], notes?: string[] }[]} rows
 * @param {{ format: (v:number)=>string, series?: string[], scale?: "linear"|"log",
 *           lowerIsBetter?: boolean, labelWidth?: number }} opts
 */
function barChart(rows, { title, eyebrow, footnote, format, series = [], scale = "linear", lowerIsBetter = true, labelWidth = 150 }) {
  const width = 880;
  const padding = 32;
  const barHeight = series.length > 1 ? 18 : 24;
  const seriesGap = 4;
  const rowGap = series.length > 1 ? 18 : 14;
  const top = 104;                       // eyebrow + title block
  const rowHeight = series.length * barHeight + (series.length - 1) * seriesGap + rowGap;
  const height = top + rows.length * rowHeight + 56;
  const plotX = padding + labelWidth;
  const plotWidth = width - plotX - padding - 72;   // 72 = value label gutter
  const max = Math.max(...rows.flatMap(row => row.values));
  const project = value =>
    scale === "log"
      ? (Math.log10(Math.max(value, 1)) / Math.log10(max)) * plotWidth
      : (value / max) * plotWidth;
  // best value per series, for the accent rule
  const best = series.length > 1 ? [] : [Math.min(...rows.map(row => row.values[0]))];
  …
}
```

규칙:
- 단일 시리즈: 막대 `T.bar`, 단 최고 성적(기본 `lowerIsBetter` → 최솟값) 막대만 `T.accent`.
- 다중 시리즈: 시리즈 0 `T.accent`, 시리즈 1 `T.accentSoft`, 시리즈 2 `T.bar`.
- 값 라벨: 막대 오른쪽 끝 +8, mono 13px, `T.inkMuted`(강조 막대는 `T.ink`).
- 변형 라벨: 왼쪽 열, 14px `T.inkMuted`, 막대 그룹 수직 중앙.
- 로그 스케일이면 footnote에 `로그 스케일` 문구를 자동으로 덧붙인다.
- 격자: 없음(값 라벨이 있어 눈금이 필요 없다). 대신 각 행 아래 hairline 1px 구분선.

- [ ] **Step 4: 세그먼트 막대 (열화 내성)**

세 조건(JS 차단 / 2s 지연 / 청크 1개 유실)별 생존 기능 수를 6칸 격자로 그린다. 칸: `rect(x,y,14,14,{rx:2})` — 생존은 `T.success`, 실패는 `T.hairline`. 행 끝에 `합계 15/18` 텍스트(mono 13px, `T.ink`).

```js
function resilienceChart(rows) {
  // rows: [{ label, conditions: [{ key, label, survived, total }], total, max }]
  …
}
```

- [ ] **Step 5: 7개 차트 정의**

```js
const benchmark = readJson("landing/benchmark.json");
const commerce = readJson("landing/commerce.json");
const lcp = readJson("landing/lcp.json");

const chartFiles = {
  // 1. 커머스: 보이기까지 vs 조작 가능해지기까지
  "commerce-session.svg": barChart(
    commerce.rows.map(row => ({ label: row.label, values: [row.entryContentReadyMs, row.listingActReadyMs] })),
    { eyebrow: "커머스 · 5세션 중앙값 · 4x CPU · Slow 4G",
      title: "보이기까지 vs 조작 가능해지기까지",
      series: ["진입 contentReady", "리스팅 actReady"],
      format: ms => `${Math.round(ms).toLocaleString()} ms`,
      footnote: "전 변형이 완성된 HTML을 내보내므로 '보이기까지'는 동률이다. 차이는 전부 '조작 가능해지기까지'에 몰린다." }
  ),
  // 2. 질문에 대한 직답: LCP는 평평하고 actReady는 14배 벌어진다
  "lcp-vs-actready.svg": barChart(…),
  // 3. 픽스처별 LCP: 이미지 LCP(커머스)와 텍스트 LCP(문서)
  "lcp-by-fixture.svg": barChart(…),
  // 4. 라우트별 초기 JS (gzip)
  "route-js.svg": barChart(…),
  // 5. 뉴스레터 빌드 cold/warm
  "build-time.svg": barChart(…),
  // 6. 뉴스레터 출력 JS 크기 (로그 스케일)
  "output-js.svg": barChart(…),
  // 7. 열화 내성
  "resilience.svg": resilienceChart(…)
};
```

각 차트의 정확한 데이터 매핑:

| 파일 | 소스 | 시리즈 | 정렬 |
| --- | --- | --- | --- |
| `commerce-session.svg` | `commerce.rows` | `entryContentReadyMs`, `listingActReadyMs` | actReady 오름차순 |
| `lcp-vs-actready.svg` | `lcp.rows`(fixture=shop, route=product) + `commerce.rows` | `lcpMs`, `listingActReadyMs` | actReady 오름차순 |
| `lcp-by-fixture.svg` | `lcp.rows`(route=product / doc / step1) | 단일 | 픽스처 그룹 안에서 LCP 오름차순, 라벨은 `픽스처 · 변형` |
| `route-js.svg` | `commerce.rows` | `homeJsGzip`, `searchJsGzip`, `checkoutJsGzip` (÷1024) | 홈 오름차순 |
| `build-time.svg` | `benchmark.rows` | `cold`, `warm` | cold 오름차순(README 표와 동일) |
| `output-js.svg` | `benchmark.rows` | 단일 `jsBytes` (÷1024), 로그 스케일 | jsBytes 오름차순 |
| `resilience.svg` | `commerce.rows` | 조건 3개 × 6기능 | `resilienceTotal` 내림차순 |

- [ ] **Step 6: 쓰기 + 실행**

```js
mkdirSync(outDir, { recursive: true });
for (const [name, svg] of Object.entries(chartFiles)) {
  writeFileSync(path.join(outDir, name), `${svg}\n`);
  console.log(`charts: assets/charts/${name} (${svg.length} B)`);
}
```

Run: `node scripts/charts.mjs`
Expected: 7줄 로그, `assets/charts/`에 7개 SVG.

- [ ] **Step 7: 실제 렌더 검증 (필수 — 눈으로 확인)**

`browser` 도구로 7개 SVG를 한 HTML에 나란히 띄우고 스크린샷을 찍는다. 확인 항목: 라벨 잘림 없음, 값 라벨이 카드 밖으로 나가지 않음, 막대 길이가 값 비례(로그 차트는 로그), 강조색이 정확히 최고 성적 막대에만.

Run:
```bash
node -e "require('fs').writeFileSync('/tmp/charts.html', require('fs').readdirSync('assets/charts').map(f=>`<img src=\"file://$PWD/assets/charts/${f}\" width=880>`).join('<br>'))"
```
그리고 `browser` 도구로 `file:///tmp/charts.html`을 열어 스크린샷. 문제가 있으면 좌표·여백을 고치고 재생성한다.

- [ ] **Step 8: package.json + 커밋**

```json
    "charts": "node ./scripts/charts.mjs",
```

```bash
git add scripts/charts.mjs package.json assets/charts
git commit -m "feat(charts): 커밋된 측정치에서 README용 SVG 막대 그래프 생성"
```

---

### Task 4: README 본문 — 차트 게시 + LCP 논거

**Files:**
- Modify: `README.md` (픽스처 표 뒤 `## 한눈에 보기` 신설, 커머스 절의 `### LCP` 본문, `<details>` 안의 "Cold/Warm LCP를 쓰지 않는 이유" 갱신, 검증 도구 목록)
- Modify: `README.en.md` (동일)

**Interfaces:**
- Consumes: Task 2가 주입한 표, Task 3이 만든 `assets/charts/*.svg`.
- Produces: 없음(문서).

- [ ] **Step 1: `## 한눈에 보기` 절 추가**

`README.md`의 픽스처 표(`| 문서 + 검색 | 5 | … |`) 다음, `<details><summary>이름과 측정 철학</summary>` **앞**에 삽입. 이미지는 상대경로 `<img>`(GitHub이 상대경로 SVG를 그대로 렌더한다), 각 차트 아래 한 줄 해설.

```markdown
## 한눈에 보기

<img src="assets/charts/commerce-session.svg" width="880" alt="커머스: 진입 contentReady와 리스팅 actReady 비교">

<img src="assets/charts/lcp-vs-actready.svg" width="880" alt="커머스: LCP와 첫 조작 가능 시점 비교">

<img src="assets/charts/route-js.svg" width="880" alt="커머스 라우트별 초기 JavaScript (gzip)">

<img src="assets/charts/build-time.svg" width="880" alt="뉴스레터 10변형 cold/warm 빌드 시간">

전부 커밋된 측정치(`landing/benchmark.json`·`commerce.json`·`lcp.json`)에서 `pnpm run charts`가 생성합니다 — 벤치를 다시 돌리지 않아도 같은 그림이 나옵니다.
```

- [ ] **Step 2: `### LCP` 본문 작성 (질문에 대한 직답)**

Task 2 Step 2에서 만든 자리에 산문을 채운다. 논지 순서: (1) 왜 헤드라인 지표가 아니었나, (2) 그래서 실제로 재봤다, (3) 수치가 말하는 것, (4) 어디서는 LCP가 실제로 갈린다.

```markdown
### LCP

처음부터 표에 없던 이유는 "재기 어려워서"가 아니라 **이 픽스처에서 프레임워크를 가르지 못해서**입니다. 다섯 변형 모두 완성된 HTML을 내보내고, 커머스의 최대 요소는 상품 사진이며, 그 PNG는 다섯 변형이 md5까지 동일합니다(`9af3706…`, 22 KB). 그래서 LCP는 이미지 디코드 시간을 재고, 렌더링 아키텍처에 대해서는 거의 말하지 않습니다.

주장으로 남기지 않고 쟀습니다(`pnpm run lcp:bench`).

<img src="assets/charts/lcp-by-fixture.svg" width="880" alt="픽스처별 LCP: 커머스는 평평하고 문서는 갈린다">

[측정 결과 3–5문장: 커머스 LCP 스프레드 vs actReady 스프레드 배수, 문서 픽스처의 텍스트 LCP 스프레드, 후보가 뒤로 밀린 변형이 있으면 그 사실.]

뉴스레터 픽스처는 이 벤치에서 제외했습니다 — 홈의 최대 요소가 Notion 이미지이고 변형마다 이미지 파이프라인이 달라(sharp / unoptimized / 원본 복사) LCP가 프레임워크가 아니라 이미지 도구를 재게 됩니다. 그 픽스처의 Lighthouse LCP는 `pnpm run perf:bench`가 냅니다.
```

숫자는 실측 후 채운다. 빈 괄호를 남기지 않는다.

- [ ] **Step 3: 기존 `<details>` 각주 갱신**

`README.md`의 커머스 측정 세부 `<details>` 요약문이 지금 `측정 세부: 지표 정의, Cold/Warm LCP를 쓰지 않는 이유, 뒤로가기 각주`이고, 본문에 "cold/warm LCP를 쓰지 않는다"는 단락이 있다. 이제 LCP 실측이 있으므로 그 단락을 **측정된 사실을 가리키는 문장**으로 바꾼다(주장 → 데이터 참조). `지표` 표에 `LCP` 행을 추가한다:

```markdown
| LCP | 브라우저 정의 그대로. `PerformanceObserver('largest-contentful-paint')`의 마지막 후보. `pnpm run lcp:bench`, 표는 위 `LCP` 절 |
```

- [ ] **Step 4: 검증 도구 목록에 추가**

```markdown
- `pnpm run lcp:bench` — 커머스·문서·폼 진입 라우트의 FCP/LCP + LCP 요소 → `landing/lcp.json`, README `LCP` 표 갱신.
- `pnpm run charts` — 커밋된 측정치에서 README용 SVG 그래프 재생성 → `assets/charts/`.
```

- [ ] **Step 5: README.en.md 동기화**

같은 4개 편집을 영어로. 차트 `alt`도 영어. `README.md`와 절 순서·문단 수가 어긋나지 않게 한다.

- [ ] **Step 6: 링크·이미지 검증**

Run:
```bash
grep -o 'assets/charts/[a-z-]*\.svg' README.md README.en.md | sort -u
ls assets/charts
```
Expected: README가 참조하는 파일 집합 ⊆ 실제 파일 집합, 오타 없음.

- [ ] **Step 7: 커밋**

```bash
git add README.md README.en.md
git commit -m "docs: 메인 벤치마크 그래프 게시 + LCP 실측 논거"
```

---

### Task 5: 재생성 검증

**Files:** 없음(검증만)

- [ ] **Step 1: 차트가 커밋된 데이터만으로 재생성되는지 확인**

Run: `node scripts/charts.mjs && git diff --exit-code assets/charts`
Expected: 종료 코드 0(출력 무변화). 실패하면 차트가 비결정적(타임스탬프·정렬 불안정) — 원인을 고친다.

- [ ] **Step 2: LCP 벤치가 표를 재주입해도 README가 안정한지 확인**

Run: `node scripts/lcp-bench.mjs --fixture form --runs 1 && git diff --stat README.md`
Expected: `README.md`의 변경이 `<!-- lcp:start -->`…`<!-- lcp:end -->` 블록 안으로만 국한된다(폼 5행만 남으므로 표는 줄어든다).
그 다음 전체 데이터를 복구: `git checkout README.md README.en.md landing/lcp.json`.

- [ ] **Step 3: 최종 상태 확인 후 푸시**

Run: `git status --short && git log --oneline -4`
Expected: 워킹 트리 클린, 4개 커밋(Task 1–4).
푸시는 `git push origin main`. **PR은 만들지 않는다**(레포 규칙).

---

## Self-Review

**1. Spec coverage**

| 스펙 항목 | 담당 |
| --- | --- |
| 번들 크기 = 이미 측정됨, 그래프로만 | Task 3(`route-js.svg`, `output-js.svg`), Task 4 Step 1 |
| LCP를 실제로 파기 | Task 1(하네스), Task 2(전체 측정·발행) |
| LCP를 빼놨던 이유 설명 | Task 4 Step 2·3 (md5 동일 PNG + actReady 대비 스프레드 실측 인용) |
| home-butler DESIGN.md 참고 | Task 3 Step 1 토큰, Global Constraints의 색·라운드·스페이싱 값 |
| 바 그래프로 메인 벤치마크 게시 | Task 3의 7개 차트, Task 4 Step 1·2 |
| README.md / README.en.md 동시 유지 | Task 2 Step 1(양쪽 주입), Task 4 Step 5 |

**2. Placeholder scan**

Task 4 Step 2의 `[측정 결과 3–5문장 …]`은 의도된 데이터 의존 자리다 — Task 2가 실제 숫자를 만든 뒤에야 쓸 수 있고, Step 2 마지막 줄에 "빈 괄호를 남기지 않는다"고 못박았다. 그 외 TBD·"적절히 처리" 류 없음. Task 3 Step 5의 `barChart(…)` 축약은 바로 아래 매핑 표가 소스·시리즈·정렬을 전부 지정하므로 구현 정보가 빠지지 않는다.

**3. Type consistency**

- `landing/lcp.json`의 `rows[].{fixture,route,label,fcpMs,lcpMs,lcpKind,lcpBytes,lcpDeltaFcpMs,lcpSamples}` — Task 1 Step 6이 쓰고, Task 2 Step 1의 `renderTable`과 Task 3 Step 5의 차트 매핑이 같은 이름으로 읽는다.
- `fixtureLabel`·`routeLabel`은 `{ko,en}` 객체 → `renderTable`이 `row.fixtureLabel[lang]`으로 접근(`lang`은 `"ko"|"en"`).
- `throttling`은 객체(`{cpu,network}`) 또는 문자열 `"none"` → 각주 렌더러가 두 경우를 모두 분기한다.
- `commerce.rows[].resilience`는 `{ "js-blocked": 3, "js-slow": 6, "chunk-404": 6 }`(생존 개수), `resilienceMax`는 18 → `resilienceChart`가 조건당 `total = resilienceMax / 조건 수 = 6`으로 격자를 그린다.
- 차트 함수 이름: `barChart`, `resilienceChart`, `frame`, `text`, `rect`, `line` — Task 3 전체에서 동일 표기.

---

## Execution notes (2026-08-18)

실행 중 계획이 틀린 것으로 드러난 지점과 그 근거. 계획서는 역사 기록이므로 원문은 남기고 차이만 적는다.

1. **프로브 종료 조건이 이미지 LCP를 놓쳤다.** Task 1 Step 4의 settle 조건(`readyState complete` + 마지막 후보 이후 1.5 s)은 히어로 이미지에 대해 구조적으로 틀렸다. 후보 순서가 역이기 때문이다 — 제목이 첫 프레임에 후보가 되고, 사진은 수 초 뒤 도착한다. 그래서 `complete`가 되는 순간 "1.5 s 조용함"이 이미 충족돼(제목 이후 7 s 경과) 1.4 MB 사진이 도착한 지 80 ms 만에 프로브가 닫혔다. 수정: settle 기준을 `max(마지막 후보, load 이벤트)`로. 추가로 후보가 0개면 예산까지 대기(VitePress는 load보다 2.3 s 늦게 그린다).
2. **CDP 네트워크 에뮬레이션은 늦게 온 이미지를 LCP 후보로 보고하지 않는다.** 계획은 `shop-bench.mjs`의 스로틀 관례를 그대로 쓰라고 했지만, 그 조건에서는 이미지 LCP를 아예 관측할 수 없다. 동일 빌드(Chromium 151)에서 측정: 무스로틀·CPU 4x 단독은 `IMG` 후보 정상, CDP Slow 4G(±CPU)는 제목만, 같은 지연을 서버에서 만들면 `IMG` 정상. 그래서 이 벤치만 대역폭을 서버(공유 토큰 버킷 + 요청당 latency)로 모델링하고 CPU만 CDP에 남겼다. 절대값은 형제 벤치와 직접 비교 불가 — README 각주에 명시.
3. **이미지 무게 조건을 새로 도입했다.** 계획에 없던 항목. 기본 픽스처의 21 KB 포스터라이즈 타일은 LCP를 FCP + 디코드로 만들어 버려서, 상점의 실제 LCP를 재려면 사진 무게가 필요하다. `OTW_IMAGE_WEIGHT=heavy`(1000px, 시드 노이즈 2옥타브 + 그레인, 1.4 MB)를 `packages/commerce-data/src/images.ts`에 추가했고 기본값은 그대로 light라서 기존 게시 수치는 유효하다. heavy는 상품 상세 라우트만 측정한다(그리드에 12장을 얹으면 로드당 1분이 넘고, 실제 상점도 그리드에 원본을 쓰지 않는다) → `--routes` 플래그 추가.
4. **행 병합과 `--readme-only`.** 단일 변형 재측정이 나머지 24행을 날리는 문제가 실제로 발생했다. 행 키를 `fixture/variant/route/imageWeight`로 하고 행마다 `measuredAt`을 기록해 병합한다. 표 포맷만 고칠 때 7분짜리 재측정을 하지 않도록 `--readme-only`를 넣었다.
5. **차트 레이아웃은 측정 기반으로 다시 썼다.** 고정 오프셋은 한국어/영어 어느 한쪽을 반드시 깨뜨렸다(제목과 범례 충돌, 각주 우측 잘림). 제목·각주는 측정 폭으로 줄바꿈하고 범례는 자체 행에 두며, 그룹 차트의 강조색은 그룹별 최고값에 붙인다. ko/en 두 세트를 `assets/charts/{ko,en}/`로 생성한다.
6. **검증.** GitHub `api.github.com/markdown`으로 두 README를 실제 렌더해 7개 차트 전부 로드·표 13개·`<details>` 6개 확인. 차트는 두 번 생성해 md5 동일(결정론).
