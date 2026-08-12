---
title: Vine 문서
titleTemplate: false
description: 시작하기부터 레퍼런스까지, Vine 프레임워크 문서를 검색합니다.
---

<h1 class="site-title">Vine 문서</h1>
<p class="site-tagline">시작하기부터 레퍼런스까지, Vine 프레임워크의 전체 가이드를 검색으로 찾아보세요.</p>
<div class="section-cards">
  <a class="section-card" href="guide/start/start-00">
    <h2>시작하기</h2>
    <p>설치부터 첫 페이지까지.</p>
  </a>
  <a class="section-card" href="guide/routing/routing-00">
    <h2>라우팅</h2>
    <p>파일 기반 라우트와 내비게이션.</p>
  </a>
  <a class="section-card" href="guide/data/data-00">
    <h2>데이터</h2>
    <p>로더, 캐시, 무효화.</p>
  </a>
  <a class="section-card" href="guide/rendering/rendering-00">
    <h2>렌더링</h2>
    <p>정적 출력과 하이드레이션.</p>
  </a>
  <a class="section-card" href="guide/deploy/deploy-00">
    <h2>배포</h2>
    <p>정적 호스트에 올리기.</p>
  </a>
  <a class="section-card" href="guide/reference/reference-00">
    <h2>레퍼런스</h2>
    <p>설정과 API 전체 목록.</p>
  </a>
</div>

<!--
  Static home content, not corpus-driven at build time: @otw/docs-data's
  SECTIONS list and each section's first-page slug pattern (`<handle>-00`,
  from pageFor's `${section.handle}-${String(indexInSection).padStart(2,
  "0")}`) are both independent of OTW_DOCS_SIZE — every corpus size
  distributes at least one page per section as long as the total is >= 6
  (true for the default of 120 and every realistic OTW_DOCS_SIZE override),
  so hardcoding here avoids a codegen round-trip for content that never
  changes.

  Hrefs are relative, extension-less paths (no leading slash) rather than
  root-relative ones: VitePress only rewrites `base` into links it compiles
  from Markdown *syntax* ([text](url)); raw HTML in a Markdown body (like
  this block, and like apps/vitepress/index.md's own comment) passes
  straight through untouched, so a root-relative `/guide/...` href here
  would point at the site root instead of /kudzu-based-bench/docs-vitepress/.
  A relative href needs no such rewriting and resolves correctly under
  cleanUrls (see .vitepress/config.ts) on GitHub Pages, `vitepress dev`, and
  scripts/lib/site-server.mjs alike.
-->
