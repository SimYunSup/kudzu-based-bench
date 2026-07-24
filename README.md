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

## 빌드 벤치마크

로컬에서 `pnpm run build:stats`를 돌리면 아래 표가 자동 갱신됩니다(scripts/build-stats.mjs). CI 자동 측정은 제거했습니다 — 공유 러너의 성능 편차로 수치 신뢰도가 낮고, 봇 커밋이 브랜치를 오염시키기 때문입니다.

특징(Type) 분류 — **SSG 특화**: 정적 사이트 출력이 존재 목적인 도구. **SSG 지원**: 범용 앱 프레임워크지만 정적 export를 지원하는 도구.

<!-- build-stats:start -->
| 변형 | 기반 | 특징 | 빌드 시간(s) | 총 출력 크기 | JS 크기 | 파일 수 | 원본 대비 diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Eleventy 3.1.6 | Node (Nunjucks) | SSG 특화 | 0.9 | 2.6 MB | 15.0 KB | 142 | - |
| Hugo 0.161.0 | Go (templates) | SSG 특화 | 0.9 | 2.6 MB | 14.8 KB | 142 | - |
| Kudzu 0.5.8 | Kudzu (JSX, no vDOM) | SSG 특화 | 0.9 | 2.6 MB | 15.9 KB | 145 | - |
| Astro 7.1.3 | Astro islands (vanilla) | SSG 특화 | 1.8 | 4.1 MB | 99.9 KB | 152 | - |
| VitePress 1.6.4 | Vue | SSG 특화 | 2.2 | 8.5 MB | 4.6 MB | 416 | - |
| Docusaurus 3.10.2 | React | SSG 특화 | 2.5 | 5.0 MB | 2.3 MB | 284 | - |
| React Router 8.3.0 | React | SSG 지원 | 3.0 | 6.8 MB | 323.4 KB | 285 | - |
| Next.js Pages Router 16.2.11 | React | SSG 지원 | 3.8 | 6.5 MB | 529.0 KB | 303 | - |
| Next.js App Router 16.2.11 | React | SSG 지원 | 4.4 | 14.4 MB | 637.0 KB | 1374 | - |
| TanStack Start 1.168.32 | React | SSG 지원 | 7.5 | 6.5 MB | 333.4 KB | 146 | - |

_로컬에서 `pnpm run build:stats`로 측정(수동 갱신), 콘텐츠 양·머신에 따라 변동. 빌드 시간 오름차순 정렬. "총 출력 크기"·"파일 수"는 이미지 파일 제외(변형별 이미지 처리 방식 차이로 인한 불공정 비교 방지). "원본 대비 diff"는 `pnpm run origin:diff`가 만든 홈 화면 픽셀 diff(라이브 원본 대비, 이미지·분석 스크립트 차단 상태)이며 없으면 `-`. 측정 머신: Apple M1 Max · 10코어 · RAM 64 GB · darwin/arm64 · Node v24.17.0. 측정 시각: 2026-07-24T07:17:45.417Z_
<!-- build-stats:end -->

### CI 측정 스냅숏 (참고)

GitHub Actions ubuntu-latest(2코어)에서 실콘텐츠 123 포스트로 마지막 측정한 수치입니다(4개 변형 시절). 콘텐츠가 실려도 순수 빌드는 십수 초 이내이고, 콘텐츠 스케일에 가장 민감한 변형은 프리렌더가 페이지 수에 비례하는 TanStack(로컬 대비 ×5.1)입니다. 과거 CI 수치(RR 312.8s 등)는 빌드가 아니라 Notion 페치 시간이었습니다(프리페치 캐시 도입 후 분리 측정).

| 변형 | 빌드 시간(s) | 총 출력 크기 | JS 크기 | 파일 수 | 로컬 대비 |
| --- | --- | --- | --- | --- | --- |
| Astro 7.x | 7.9 | 5.0 MB | 99.9 KB | 157 | ×3.3 |
| React Router 7.x | 8.9 | 6.8 MB | 322.8 KB | 286 | ×3.4 |
| TanStack 1.x | 15.9 | 6.4 MB | 332.8 KB | 147 | ×5.1 |
| Kudzu 0.5.x | 1.4 | 2.5 MB | 15.9 KB | 146 | ×1.8 |

_2026-07-23 측정 스냅숏(수동 유지, 당시 4개 변형·React Router v7 시절). 출력 크기·파일 수 차이는 콘텐츠 유무 때문이고, JS 크기는 콘텐츠와 무관하게 동일합니다. 현행 변형·버전은 위 표를 참조._

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
