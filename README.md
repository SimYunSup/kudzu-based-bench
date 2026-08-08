# kudzu-based-bench

[English](./README.en.md) · **한국어**

같은 사이트를 여러 프레임워크로 정적 빌드해 **무엇이 실제로 달라지는지** 재는 pnpm 워크스페이스 모노레포입니다.

픽스처는 두 종류입니다.

- **뉴스레터** — [Ones to Watch for FE](https://ones-to-watch.ethansup.net)의 Notion 콘텐츠를 10개 프레임워크로. 콘텐츠 중심이라 빌드 비용과 출력 크기를 봅니다.
- **커머스** — Next.js Commerce 수준의 상점을 5개 프레임워크로. 상호작용이 있어야 렌더링 아키텍처 차이가 드러납니다.

이름이 kudzu인 이유는 [kudzu](https://github.com/kudzujs/kudzu)에서 출발했기 때문이지, kudzu로 만들어서가 아닙니다. 벤치 대상은 15개 변형 전부이고, kudzu가 지는 축도 그대로 싣습니다.

측정 방식에 대한 입장이 하나 있습니다. **합성 조작(1,000행 reverse, ops/sec)은 재지 않습니다.** 실사용 대응물이 없고, 2026년에 그 축은 모든 프레임워크가 이미 충분히 빠릅니다. 대신 실제 세션을 재생하고, 사용자가 관측할 수 있는 것만 판정 기준으로 씁니다.

## 구조

`landing/` — 사이트 루트(`https://simyunsup.github.io/kudzu-based-bench/`)에 배포되는 변형 선택 랜딩 페이지.

**뉴스레터 픽스처** — 같은 Notion 콘텐츠, 10가지 빌드

| 앱 | 도구 | 배포 경로 |
| --- | --- | --- |
| `apps/web` | Astro (islands) | `/astro/` |
| `apps/react-router` | React Router v8 (framework mode, prerender) | `/react-router/` |
| `apps/tanstack-router` | TanStack Start (정적 prerender) | `/tanstack/` |
| `apps/kudzu` | [kudzu](https://github.com/kudzujs/kudzu) | `/kudzu/` |
| `apps/hugo` | Hugo (Go 바이너리, hugo-bin) | `/hugo/` |
| `apps/vitepress` | VitePress 커스텀 테마 | `/vitepress/` |
| `apps/docusaurus` | Docusaurus 커스텀 플러그인 | `/docusaurus/` |
| `apps/eleventy` | Eleventy (11ty) v3 | `/eleventy/` |
| `apps/next-app` | Next.js App Router (`output: "export"`) | `/next-app/` |
| `apps/next-pages` | Next.js Pages Router (`output: "export"`) | `/next-pages/` |

**커머스 픽스처** — 같은 상점, 5가지 빌드. 홈 · 검색(필터·정렬) · 컬렉션 · 상품 상세(옵션·담기) · 정책 · 결제 6라우트를 동일한 DOM·동작 계약으로 구현합니다.

| 앱 | 도구 | 배포 경로 |
| --- | --- | --- |
| `apps/shop-kudzu` | Kudzu 0.8.15, 네이티브 문서 내비게이션 | `/shop-kudzu/` |
| `apps/shop-astro` | Astro 7 + React 아일랜드 3개(`client:load`) | `/shop-astro/` |
| `apps/shop-react-router` | React Router v8, 전 라우트 prerender | `/shop-react-router/` |
| `apps/shop-tanstack` | TanStack Start 정적 prerender | `/shop-tanstack/` |
| `apps/shop-next-app` | Next.js App Router `output: "export"` | `/shop-next-app/` |

**공용 패키지**

- `packages/notion-content` — 프레임워크 중립 Notion 콘텐츠 페처(`@otw/notion-content`). astro를 제외한 모든 뉴스레터 변형이 빌드 타임에 씁니다.
- `packages/notion-loader` — Notion을 Astro Content Layer로 불러오는 로더(`@otw/notion-loader`).
- `packages/commerce-data` — 결정론적 카탈로그 생성기(`@otw/commerce-data`). 시드가 고정이라 같은 크기는 항상 같은 바이트를 만듭니다. `OTW_CATALOG_SIZE`로 100/1,000/10,000 전환.
- `apps/crawler` — 뉴스레터 썸네일·북마크 크롤링 Cloudflare Queue 워커.

## 뉴스레터 빌드 벤치마크

로컬에서 `pnpm run build:stats`를 돌리면 아래 표가 자동 갱신됩니다(scripts/build-stats.mjs). CI 자동 측정은 제거했습니다 — 공유 러너의 성능 편차로 수치 신뢰도가 낮고, 봇 커밋이 브랜치를 오염시키기 때문입니다.

특징(Type) 분류 — **SSG 특화**: 정적 사이트 출력이 존재 목적인 도구. **SSG 지원**: 범용 앱 프레임워크지만 정적 export를 지원하는 도구.

<!-- build-stats:start -->
| 변형 | 기반 | 특징 | cold(ms) | warm(ms) | 총 출력 크기 | JS 크기 | 파일 수 | 원본 대비 diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Eleventy 3.1.6 | Node (Nunjucks) | SSG 특화 | 708 | 706 | 2.6 MB | 15.0 KB | 142 | 0.400% |
| Hugo 0.161.0 | Go (templates) | SSG 특화 | 708 | 702 | 2.6 MB | 14.8 KB | 142 | 0.395% |
| Kudzu 0.8.15 | Kudzu (JSX, no vDOM) | SSG 특화 | 841 | 843 | 2.6 MB | 15.0 KB | 141 | 0.395% |
| VitePress 1.6.4 | Vue | SSG 특화 | 1764 | 1753 | 8.5 MB | 4.6 MB | 416 | 0.402% |
| React Router 8.3.0 | React | SSG 지원 | 2225 | 2252 | 6.8 MB | 323.0 KB | 285 | 0.405% |
| Next.js Pages Router 16.2.11 | React | SSG 지원 | 3137 | 3173 | 6.4 MB | 527.6 KB | 303 | 0.403% |
| Next.js App Router 16.2.11 | React | SSG 지원 | 3601 | 3639 | 14.2 MB | 636.9 KB | 1374 | 0.401% |
| Astro 7.1.3 | Astro islands (vanilla) | SSG 특화 | 4865 | 2546 | 4.7 MB | 99.9 KB | 152 | 0.320% |
| Docusaurus 3.10.2 | React | SSG 특화 | 5152 | 1774 | 5.0 MB | 2.2 MB | 284 | 0.403% |
| TanStack Start 1.168.32 | React | SSG 지원 | 5828 | 5826 | 6.5 MB | 333.3 KB | 146 | 0.399% |

_로컬에서 `pnpm run build:stats`로 측정(수동 갱신). **cold**는 출력과 프레임워크 빌드 캐시를 모두 지운 상태(CI 캐시 미스), **warm**은 출력만 지우고 캐시는 남긴 상태(CI 캐시 히트, 또는 로컬 두 번째 빌드)입니다. 둘의 차이가 그 도구의 캐시가 실제로 벌어주는 시간입니다. 각각 워밍업 1회를 버리고 3회를 잰 중앙값이며, 회차별 원본값은 `landing/benchmark.json`의 `coldSamples`·`warmSamples`에 있습니다. cold 오름차순 정렬. "총 출력 크기"·"파일 수"는 이미지 파일 제외(변형별 이미지 처리 방식 차이로 인한 불공정 비교 방지). "원본 대비 diff"는 `pnpm run origin:diff`가 만든 홈 화면 픽셀 diff(라이브 원본 대비, 이미지·분석 스크립트 차단 상태)이며 없으면 `-`. 측정 머신: Apple M4 · 10코어 · RAM 16 GB · darwin/arm64 · Node v24.17.0. 측정 시각: 2026-08-08T05:52:12.716Z_
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

### 카탈로그 스케일 (cold / warm, 중앙값)

**cold**는 출력과 프레임워크 빌드 캐시를 모두 지운 상태(CI 캐시 미스), **warm**은 출력만 지우고 캐시는 남긴 상태(CI 캐시 히트)입니다. 어느 쪽도 "증분"이 아닙니다 — 이전 빌드 위에 덧씌워 배포하는 파이프라인은 없으니 출력은 항상 비어서 시작하고, 달라지는 건 캐시뿐입니다. 워밍업 1회를 버리고 각 3회 중앙값.

| 변형 | 100개 | 1,000개 | 페이지당(1,000개) |
| --- | ---: | ---: | ---: |
| Astro | 1,406 / 1,375 ms | **1,815 / 1,785 ms** | 1.82 ms |
| TanStack | 2,153 / 2,136 ms | 3,038 / 3,031 ms | 3.04 ms |
| React Router | 1,873 / 1,863 ms | 3,200 / 3,104 ms | 3.20 ms |
| Next.js | 3,536 / 3,628 ms | 4,668 / 5,159 ms | 4.67 ms |
| Kudzu | **1,536 / 1,514 ms** | 5,848 / 5,866 ms | 5.85 ms |

**Kudzu는 여기서 집니다.** 100개에서는 Astro에 이어 2위인데 1,000개에서는 꼴찌이고, 3.8배로 가장 가파르게 늘어납니다(Astro 1.3배). 상품마다 effect 모듈과 native 핸들러 모듈을 따로 emit하므로 빌드 비용 동인은 페이지 렌더링이 아니라 라우트별 capability ESM emission입니다. 커머스에서는 다섯 다 cold와 warm이 같습니다. 캐시가 실제로 일하는 건 뉴스레터 픽스처의 Docusaurus(66% 단축)와 Astro(48%)뿐이고, 그것도 이미지·콘텐츠 파이프라인이 있을 때 얘기입니다.

_측정 머신: Apple M4 · 10코어 · RAM 16 GB · darwin/arm64 · Node v24.17.0. 원본 JSON은 `bench/`에 있습니다(git 추적 제외)._

## 리팩토링에서 발견한 실전 결함·제약

프레임워크 자체에 이슈로 올릴 만한(업스트림 버그이거나 문서화되지 않은 제약) 것만 추립니다. 우리 앱 설정/이력(모노레포 workspace 추론, deprecated API 사용 등)이나 프레임워크가 의도한 정상 제약은 제외했습니다.

1. **TanStack Start — 서브경로 배포에서 SPA 전환 무한 대기 (실버그)**
   `@tanstack/start-static-server-functions`가 프리렌더된 서버 함수 캐시를 origin 루트(`/__tsr/staticServerFnCache/...`) 절대 경로로 fetch합니다. GitHub Pages처럼 `/<repo>/` 서브경로에 배포하면 이 요청이 404가 나면서 라우트가 pending에 갇혀 클라이언트 전환이 영영 끝나지 않습니다(딥링크는 프리렌더 HTML이라 정상 → 로컬 dev에선 재현 안 됨). 이 레포에서는 해당 미들웨어를 base-aware로 벤더링해 우회했습니다(`apps/tanstack-router/src/lib/staticFunctionMiddleware.ts`, `import.meta.env.BASE_URL` 접두).
   **2026-08-08 재확인: 미수정.** 최신 `1.167.24`(2026-08-07 발행)의 `dist/`에 `BASE_URL`·`basepath`·`baseUrl`·`import.meta.env` 문자열이 하나도 없습니다. 우회는 계속 필요합니다.
2. **Next.js App Router — `output: "export"`에서 `generateStaticParams()`가 빈 배열이면 빌드 실패**
   Pages Router(`getStaticPaths` → `paths: []`, `fallback: false`)는 빈 컬렉션을 그대로 허용하지만, App Router는 정적 export에서 동적 라우트가 최소 1개 경로를 내놓지 못하면 빌드가 죽습니다. 이 레포는 빈 컬렉션일 때 sentinel 경로(`_none`) + `dynamicParams = false` + `notFound()` 조합으로 방어합니다(`apps/next-app/src/app/news/post/[id]/page.tsx`). 같은 프레임워크의 두 라우터가 같은 상황에서 다르게 동작하는 사례.
3. **VitePress — 동적 라우트는 디렉터리형 pretty URL을 만들 수 없음**
   `[page].md` 동적 라우트는 `cleanUrls` 설정과 무관하게 항상 평면 `<param>.html` 파일로만 출력됩니다(`/news/list/1/index.html` 형태 불가). GitHub Pages가 확장자 없는 요청을 `.html`로 서빙해 주기 때문에 `cleanUrls: true`로 다른 변형과 동등한 URL 계약을 맞췄지만, 트레일링 슬래시 유무는 다릅니다.
4. **Docusaurus — 커스텀 플러그인의 `addRoute` 경로는 baseUrl-프리픽스여야 함**
   `<BrowserRouter>`가 basename 없이 마운트돼(코어 `clientEntry.js`) 클라이언트는 baseUrl 포함 전체 URL로 매칭합니다. 플러그인이 언프리픽스 경로(`/`, `/news/list/1`)로 `addRoute`하면 SSG(StaticRouter 직접 구동)는 정상이지만 하이드레이션 시 아무 라우트도 안 맞아 catch-all `@theme/NotFound`로 폴백 → React #418. `normalizeUrl([baseUrl, path])` 프리픽스로 등록해야 합니다(코어 콘텐츠 플러그인·`useBaseUrl`과 동일).
5. **React Router v8 — `ssr: false` prerender가 basename 아래로 한 겹 더 중첩**
   basename은 배포 경로 전체여야 클라이언트 라우팅이 서빙 URL과 맞는데, prerender 플러그인이 그 basename을 출력 경로에도 적용해 실제 페이지가 `build/client/<basename>/<route>/index.html`로 들어갑니다. `build/client` 루트에는 SPA 폴백 셸이 대신 놓여서, 그 디렉터리를 문서 루트로 서빙하면 홈이 빈 셸이 됩니다. 후처리로 끌어올려 우회했습니다(`apps/shop-react-router/scripts/flatten-build.mjs`).
6. **TanStack Start — 정적 출력이 `dist/client`에 들어감**
   기본 다중 환경 빌드가 `dist/client`(정적)와 `dist/server`(쓰지 않는 서버 번들)로 나눕니다. 정적 호스트에 그대로 올리면 한 단계 어긋납니다. `environments.client.build.outDir`로 고정했습니다(`apps/shop-tanstack/vite.config.ts`). 덤으로 `dist/server` 번들에는 빌드 머신의 절대 경로가 그대로 구워집니다.
7. **Kudzu 0.8.x — 커머스를 컴파일하며 만난 문법 경계 6개**
   전부 `apps/shop-kudzu` 소스에 주석으로 남겼습니다. 요약: (a) JSX 이벤트 핸들러 밖의 패키지 import 전면 거부 → 빌드 타임 데이터를 codegen으로 상대 모듈화해야 함, (b) imported 배열의 `.map()`은 JSX 밖에서도 keyed-list로 가로채여 거부 → `for` 루프, (c) 행 컴포넌트에 객체 prop 불가 → intrinsic 마크업 인라인, (d) 선택자 파이프라인(`filter`/`toSorted`)의 소스는 literal로 emit된 상대 import 배열만 가능 — 컴포넌트 안 `const` 별칭은 스칼라로 검증돼 거부되고 `useState(rows)`는 signal이라 런타임에 `rows.filter is not a function`, (e) `new CustomEvent` 거부로 컴포넌트 간 상태 통지 불가, (f) `navigation` 그룹이 멤버 라우트 전수 열거를 요구해 `getStaticPaths` 카탈로그에 적용 불가.

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
