![thumbnail](./apps/web/public/images/thumbnail.png)

# Ones To Watch For FrontEnd (KR) — Monorepo

[English](./README.en.md) · **한국어**

**Ones to Watch for FE**는 주목할 만한 블로그를 모아두는 웹사이트입니다.
개인적인 관심과 기록의 의미로 시작했으며, 프론트엔드 개발자에게 인사이트가 될 수 있을만한 글을 소개합니다.

이 저장소는 같은 Notion 뉴스레터 사이트를 **10가지 프레임워크**로 각각 정적 빌드해 GitHub Pages 한 곳에 배포하는 pnpm 워크스페이스 모노레포입니다.

## 구조

- `landing/` — 사이트 루트(`https://simyunsup.github.io/ones-to-watch-refactor-test/`)에 배포되는 변형 선택 랜딩 페이지.
- `apps/web` — 정적(Static) Astro 사이트. `/astro/` 경로에 배포됩니다.
- `apps/react-router` — React Router v8(framework mode, prerender) 리팩토링. `/react-router/`.
- `apps/tanstack-router` — TanStack Start(정적 prerender) 리팩토링. `/tanstack/`.
- `apps/kudzu` — [kudzu](https://github.com/kudzujs/kudzu) 리팩토링. `/kudzu/`.
- `apps/hugo` — Hugo(Go 바이너리, hugo-bin) 리팩토링. `/hugo/`.
- `apps/vitepress` — VitePress 커스텀 테마 리팩토링. `/vitepress/`.
- `apps/docusaurus` — Docusaurus 커스텀 플러그인 리팩토링. `/docusaurus/`.
- `apps/eleventy` — Eleventy(11ty) v3 리팩토링. `/eleventy/`.
- `apps/next-app` — Next.js App Router(output:export) 리팩토링. `/next-app/`.
- `apps/next-pages` — Next.js Pages Router(output:export) 리팩토링. `/next-pages/`.
- `apps/crawler` — 뉴스레터 썸네일/북마크 크롤링을 담당하는 Cloudflare Queue 워커.
- `packages/notion-loader` — Notion을 Astro Content Layer로 불러오는 로더 패키지(`@otw/notion-loader`).
- `packages/notion-content` — 프레임워크 중립 Notion 콘텐츠 페처(`@otw/notion-content`). astro를 제외한 모든 변형이 빌드 타임에 사용합니다.

커머스 픽스처(뉴스레터와 별개, 상호작용 측정용):

- `packages/commerce-data` — 결정론적 카탈로그 생성기(`@otw/commerce-data`). 시드가 고정이라 같은 크기는 항상 같은 바이트를 만듭니다. `OTW_CATALOG_SIZE`로 100/1,000/10,000 전환.
- `apps/shop-kudzu` — Kudzu 0.8.15. 네이티브 문서 내비게이션.
- `apps/shop-astro` — Astro 7 + React 아일랜드 3개(`client:load`).
- `apps/shop-react-router` — React Router v8 framework mode, 전 라우트 prerender.
- `apps/shop-tanstack` — TanStack Start 정적 prerender.
- `apps/shop-next-app` — Next.js App Router `output: "export"`.

## 빌드 벤치마크

로컬에서 `pnpm run build:stats`를 돌리면 아래 표가 자동 갱신됩니다(scripts/build-stats.mjs). CI 자동 측정은 제거했습니다 — 공유 러너의 성능 편차로 수치 신뢰도가 낮고, 봇 커밋이 브랜치를 오염시키기 때문입니다.

특징(Type) 분류 — **SSG 특화**: 정적 사이트 출력이 존재 목적인 도구. **SSG 지원**: 범용 앱 프레임워크지만 정적 export를 지원하는 도구.

<!-- build-stats:start -->
| 변형 | 기반 | 특징 | 빌드 시간(ms) | 총 출력 크기 | JS 크기 | 파일 수 | 원본 대비 diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kudzu 0.8.15 | Kudzu (JSX, no vDOM) | SSG 특화 | 1251 | 2.6 MB | 15.0 KB | 141 | 0.395% |
| Eleventy 3.1.6 | Node (Nunjucks) | SSG 특화 | 1258 | 2.7 MB | 15.0 KB | 142 | 0.400% |
| Hugo 0.161.0 | Go (templates) | SSG 특화 | 1417 | 2.6 MB | 14.8 KB | 142 | 0.395% |
| VitePress 1.6.4 | Vue | SSG 특화 | 2588 | 8.5 MB | 4.6 MB | 416 | 0.402% |
| React Router 8.3.0 | React | SSG 지원 | 2785 | 6.8 MB | 323.4 KB | 285 | 0.405% |
| Next.js Pages Router 16.2.11 | React | SSG 지원 | 3514 | 6.5 MB | 528.1 KB | 303 | 0.403% |
| Next.js App Router 16.2.11 | React | SSG 지원 | 4405 | 14.4 MB | 636.9 KB | 1374 | 0.401% |
| TanStack Start 1.168.32 | React | SSG 지원 | 6435 | 6.5 MB | 333.4 KB | 146 | 0.399% |
| Astro 7.1.3 | Astro islands (vanilla) | SSG 특화 | 6483 | 4.7 MB | 99.9 KB | 152 | 0.320% |
| Docusaurus 3.10.2 | React | SSG 특화 | 6957 | 5.0 MB | 2.2 MB | 284 | 0.403% |

_로컬에서 `pnpm run build:stats`로 측정(수동 갱신), 콘텐츠 양·머신에 따라 변동. 빌드 시간 오름차순 정렬. "총 출력 크기"·"파일 수"는 이미지 파일 제외(변형별 이미지 처리 방식 차이로 인한 불공정 비교 방지). "원본 대비 diff"는 `pnpm run origin:diff`가 만든 홈 화면 픽셀 diff(라이브 원본 대비, 이미지·분석 스크립트 차단 상태)이며 없으면 `-`. 측정 머신: Apple M4 · 10코어 · RAM 16 GB · darwin/arm64 · Node v24.17.0. 측정 시각: 2026-08-08T02:08:56.782Z_
<!-- build-stats:end -->

## 커머스 벤치마크

뉴스레터 변형은 상호작용이 없어 렌더링 아키텍처 차이가 드러나지 않습니다. Next.js Commerce 수준의 상점(홈 · 검색 · 컬렉션 · 상품 상세 · 정책 · 결제)을 다섯 프레임워크에 **같은 DOM·같은 동작 계약**으로 구현하고, 실제 세션을 재생해 측정합니다.

```bash
pnpm run build:shop     # 다섯 변형 빌드 (OTW_CATALOG_SIZE=100|1000|10000)
pnpm run shop:bench     # 세션 재생 + 클릭 유실률 + 열화 내성
pnpm run shop:assets    # 라우트별 JS 무게 (브라우저가 실제로 받은 바이트)
pnpm run shop:scale     # 카탈로그 크기별 빌드 시간
```

### Cold LCP / Warm LCP를 쓰지 않는 이유

사람은 "cold 방문"과 "warm 방문"을 하지 않습니다. 한 세션 안에서 첫 페이지는 빈 캐시로 열고, 이후 네댓 페이지는 그 캐시를 물려받으며 이동합니다. 두 버킷으로 쪼개면 비용이 세션에 어떻게 분포하는지가 사라집니다. 게다가 커머스의 LCP는 상품 사진이고, 이 픽스처의 이미지는 전 변형 바이트 동일이라 프레임워크에 대해 아무것도 말해주지 않습니다.

대신 네 가지를 잽니다.

| 지표 | 정의 |
| --- | --- |
| contentReady | navigationStart → 그 단계의 핵심 텍스트(상품명·가격)가 DOM에 존재 |
| actReady | 컨트롤이 **실제로 동작하기까지**. 50 ms 간격 재시도로 측정하며 프레임워크 내부 신호는 보지 않음 |
| stepLatency | 성공한 dispatch → next paint. INP와 같은 정의 |
| 클릭 유실률 | 첫 페인트 + Δ에 "담기"를 눌렀을 때 무시되는 비율 |

### 세션 재생 (5세션 중앙값, 4x CPU · Slow 4G)

| 변형 | 진입 contentReady | 리스팅 첫 조작 actReady | 정렬 stepLatency | 담기 stepLatency | 첫 신뢰 클릭 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kudzu 0.8.15 | 173 ms | **250 ms** | 2.3 ms | 1.0 ms | **첫 페인트 +300 ms** |
| Astro 7 (islands) | 234 ms | 2,214 ms | 11.7 ms | 2.4 ms | +1,500 ms |
| TanStack Start | 173 ms | 2,950 ms | 7.6 ms | 1.8 ms | +2,000 ms |
| React Router v8 | 174 ms | 2,959 ms | 29.4 ms | 2.0 ms | +2,000 ms |
| Next.js App Router | 175 ms | 3,768 ms | 29.9 ms | 2.1 ms | +3,000 ms |

**contentReady는 사실상 동률입니다.** 다섯 다 완성된 HTML을 보내니 당연합니다. 차이는 전부 "조작 가능해지기까지"에 몰려 있고, 그게 이 픽스처가 존재하는 이유입니다.

클릭 유실 측정은 저널리와 **별도 세션**에서 돕니다. Δ 격자를 5초까지 훑으면 상품 페이지를 스무 번 넘게 다시 열게 되고, 그 사이 모듈 캐시가 데워져서 뒤따르는 저널리의 actReady가 실제보다 훨씬 좋게 나옵니다(실제로 Next가 3,768 ms → 0.1 ms로 붕괴한 적이 있습니다).

### 라우트별 초기 JavaScript (KB gzip)

브라우저가 실제로 내려받은 바이트입니다. import 그래프 정적 분석은 프레임워크마다 결과가 달라집니다 — Astro는 아일랜드 런타임을 인라인 부트스트랩 안의 동적 `import()`로 가져오기 때문에, 정적 크롤러로는 60 KB짜리를 1.8 KB로 잘못 셉니다.

| 변형 | 홈 | 검색 | 상품 | 결제 | 총 출력(이미지 제외) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kudzu | **4.6** | 9.3 | 4.9 | **4.6** | 1.20 MB |
| Astro | 60.6 | 61.0 | 61.1 | 60.6 | 1.75 MB |
| React Router | 104.2 | 104.2 | 104.5 | 104.1 | 1.12 MB |
| TanStack | 104.0 | 103.9 | 104.1 | 103.6 | 1.62 MB |
| Next.js | 145.5 | 146.2 | 145.2 | 144.4 | 4.83 MB |

Kudzu만 라우트에 따라 변합니다(검색 페이지의 keyed-list 런타임 +4.7 KB). 나머지는 결제 페이지에서도 홈과 같은 무게를 냅니다. Astro의 아일랜드 분할은 실재하지만, 카트 배지가 전역 헤더에 있는 한 react-dom 런타임은 모든 라우트가 냅니다.

### 열화 내성

여섯 기능(정보 읽기 · 카테고리 이동 · 상세 진입 · 필터 · 옵션 선택 · 담기)이 세 조건에서 몇 개나 살아남는지. 광고 차단, 캡티브 포털, CDN 부분 장애, 지하철 터널이 실제로 만드는 상태입니다.

| 변형 | JS 전면 차단 | 스크립트 2s 지연 | 스크립트 1개 유실 | 합계 |
| --- | ---: | ---: | ---: | ---: |
| Kudzu | 3/6 | 6/6 | 6/6 | **15/18** |
| Astro | 3/6 | 3/6 | 6/6 | 12/18 |
| TanStack | 3/6 | 2/6 | 4/6 | 9/18 |
| Next.js | 3/6 | 2/6 | 3/6 | 8/18 |
| React Router | 3/6 | 2/6 | 3/6 | 8/18 |

JS를 완전히 끄면 다섯 다 "읽기·이동·상세 진입"만 남습니다(정적 문서 + 네이티브 앵커). 갈리는 건 스크립트가 늦거나 하나 빠졌을 때입니다.

### 카탈로그 스케일 (클린 / 증분, 중앙값)

증분은 상품 하나의 가격만 바꾼 뒤 재빌드입니다. 야간 재고·가격 배치의 실제 비용이고, "N페이지를 M초에" 같은 헤드라인이 빠뜨리는 숫자입니다.

| 변형 | 100개 | 1,000개 | 페이지당(1,000개) |
| --- | ---: | ---: | ---: |
| Astro | 1,436 / 1,403 ms | **1,833 / 1,938 ms** | 1.83 ms |
| TanStack | 2,169 / 2,212 ms | 3,090 / 3,213 ms | 3.09 ms |
| React Router | 1,883 / 1,978 ms | 3,257 / 3,371 ms | 3.26 ms |
| Next.js | 3,616 / 3,789 ms | 4,716 / 5,832 ms | 4.72 ms |
| Kudzu | **1,536 / 1,567 ms** | 5,963 / 6,211 ms | 5.96 ms |

**Kudzu는 여기서 집니다.** 100개에서 가장 빠르고 1,000개에서 가장 느립니다. 상품마다 effect 모듈과 native 핸들러 모듈을 따로 emit하므로 빌드 비용 동인은 페이지 렌더링이 아니라 라우트별 capability ESM emission입니다. 증분 빌드를 지원하는 변형은 하나도 없습니다 — 다섯 다 클린과 증분이 같습니다.

_측정 머신: Apple M4 · 10코어 · RAM 16 GB · darwin/arm64 · Node v24.17.0. 원본 JSON은 `bench/`에 있습니다(git 추적 제외)._

## 리팩토링에서 발견한 실전 결함·제약

프레임워크 자체에 이슈로 올릴 만한(업스트림 버그이거나 문서화되지 않은 제약) 것만 추립니다. 우리 앱 설정/이력(모노레포 workspace 추론, deprecated API 사용 등)이나 프레임워크가 의도한 정상 제약은 제외했습니다.

1. **TanStack Start — 서브경로 배포에서 SPA 전환 무한 대기 (실버그)**
   `@tanstack/start-static-server-functions`가 프리렌더된 서버 함수 캐시를 origin 루트(`/__tsr/staticServerFnCache/...`) 절대 경로로 fetch합니다. GitHub Pages처럼 `/<repo>/` 서브경로에 배포하면 이 요청이 404가 나면서 라우트가 pending에 갇혀 클라이언트 전환이 영영 끝나지 않습니다(딥링크는 프리렌더 HTML이라 정상 → 로컬 dev에선 재현 안 됨). 이 레포에서는 해당 미들웨어를 base-aware로 벤더링해 우회했습니다(`apps/tanstack-router/src/lib/staticFunctionMiddleware.ts`, `import.meta.env.BASE_URL` 접두).
2. **Next.js App Router — `output: "export"`에서 `generateStaticParams()`가 빈 배열이면 빌드 실패**
   Pages Router(`getStaticPaths` → `paths: []`, `fallback: false`)는 빈 컬렉션을 그대로 허용하지만, App Router는 정적 export에서 동적 라우트가 최소 1개 경로를 내놓지 못하면 빌드가 죽습니다. 이 레포는 빈 컬렉션일 때 sentinel 경로(`_none`) + `dynamicParams = false` + `notFound()` 조합으로 방어합니다(`apps/next-app/src/app/news/post/[id]/page.tsx`). 같은 프레임워크의 두 라우터가 같은 상황에서 다르게 동작하는 사례.
3. **VitePress — 동적 라우트는 디렉터리형 pretty URL을 만들 수 없음**
   `[page].md` 동적 라우트는 `cleanUrls` 설정과 무관하게 항상 평면 `<param>.html` 파일로만 출력됩니다(`/news/list/1/index.html` 형태 불가). GitHub Pages가 확장자 없는 요청을 `.html`로 서빙해 주기 때문에 `cleanUrls: true`로 다른 변형과 동등한 URL 계약을 맞췄지만, 트레일링 슬래시 유무는 다릅니다.
4. **Docusaurus — 커스텀 플러그인의 `addRoute` 경로는 baseUrl-프리픽스여야 함**
   `<BrowserRouter>`가 basename 없이 마운트돼(코어 `clientEntry.js`) 클라이언트는 baseUrl 포함 전체 URL로 매칭합니다. 플러그인이 언프리픽스 경로(`/`, `/news/list/1`)로 `addRoute`하면 SSG(StaticRouter 직접 구동)는 정상이지만 하이드레이션 시 아무 라우트도 안 맞아 catch-all `@theme/NotFound`로 폴백 → React #418. `normalizeUrl([baseUrl, path])` 프리픽스로 등록해야 합니다(코어 콘텐츠 플러그인·`useBaseUrl`과 동일).

## 검증 도구 (로컬 전용)

- `pnpm run build:stats` — 변형별 클린 빌드 시간·산출물 크기 측정 → README 표 갱신.
- `pnpm run perf:bench` — Lighthouse desktop(변형×홈/아카이브, 3회 중앙값) + 홈→아카이브 라우팅 전환 측정 → `bench/report.md`.
- `pnpm run origin:diff` — 라이브 원본(ones-to-watch.ethansup.net) 대비 배포 변형 픽셀 diff.
- `pnpm run visual:diff` — 로컬 빌드 변형 간 픽셀 diff(astro 기준).
- `pnpm run test:e2e` — Playwright e2e(변형 × 5 시나리오).
- `pnpm run build:shop` — 커머스 픽스처 다섯 변형 빌드(`OTW_CATALOG_SIZE`로 카탈로그 크기 지정).
- `pnpm run shop:bench -- --variant shop-kudzu` — 세션 재생·클릭 유실률·열화 내성 → `bench/<variant>.json`.
- `pnpm run shop:assets` — 라우트별 초기 JS를 브라우저에서 실측 → `bench/shop-assets.json`.
- `pnpm run shop:scale -- --sizes 100,1000,10000` — 카탈로그 크기별 클린·증분 빌드 시간 → `bench/shop-scale.json`.

## 개발

Node.js(fnm 권장, `.nvmrc` 참고)가 설치되어야 합니다. Lume 등 비-Node 도구는 없고, Hugo 바이너리는 `hugo-bin` 패키지가 설치 시 자동으로 받습니다.

```bash
corepack enable # 만약 pnpm이 없다면

pnpm install

pnpm dev
```

`pnpm build`는 `apps/web`을, `pnpm build:variants`는 `@otw/notion-content` 컴파일 후 나머지 9개 변형을, `pnpm build:all`은 열 개 앱 전부를 빌드합니다.

## 배포

CI 배포 워크플로는 제거했습니다 — 배포는 로컬에서 합니다.

```bash
pnpm run deploy:pages              # prefetch → build:all → site/ 조립 → gh-pages 브랜치 푸시
pnpm run deploy:pages -- --skip-build  # 이미 빌드된 산출물로 조립·푸시만
```

`scripts/deploy-pages.mjs`가 Notion을 1회 프리페치해 전 변형을 빌드하고, 벤치·e2e가 쓰는 것과 동일한 `assembleSite()` 레이아웃으로 `site/`를 조립한 뒤 orphan 커밋으로 `gh-pages` 브랜치에 강제 푸시합니다(히스토리 무축적). 최초 1회는 GitHub Settings → Pages에서 소스를 `gh-pages` 브랜치로 지정해야 합니다(스크립트가 gh api로 자동 설정을 시도합니다).

## 컨텐츠

콘텐츠 로딩에는 `NOTION_TOKEN`, `NOTION_DATABASE_ID` 환경 변수(로컬 `.env`)가 필요합니다.
값이 없으면 `@otw/notion-loader`/`@otw/notion-content`가 빈 컬렉션으로 정상적으로 빌드되므로, 시크릿이 없어도 사이트 자체는 빌드에 실패하지 않습니다.

직접적인 컨텐츠 기여는 [심윤섭](https://github.com/SimYunSup)이나 이슈를 통해 제안주시면 감사하겠습니다!

## License

MIT License
