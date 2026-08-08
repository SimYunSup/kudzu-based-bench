// Project-page deployment: this app is served from
// https://simyunsup.github.io/kudzu-based-bench/next-pages/ alongside
// the other framework variants. `basePath` prefixes next/link, next/image, and
// next/head-generated URLs automatically, but not hand-authored asset paths
// (the search.js <script> src, the favicon <link>, or the fetch()/import
// specifiers inside public/search.js itself) — see src/lib/site.ts for the
// matching constant those use instead.
//
// `output: "export"` + `trailingSlash: true` makes `next build` write plain
// static HTML/CSS/JS to out/ (each route as `<path>/index.html`), which is
// what a directory-listing static host like GitHub Pages needs — there is no
// Node server at runtime to fall back to. This is also why every dynamic
// route's getStaticPaths (src/pages/news/list/[page].tsx,
// src/pages/news/post/[id].tsx) must return `fallback: false`: Next rejects
// `true`/`"blocking"` at build time under `output: "export"` because both
// require a live server to render paths not already emitted to out/.
/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/kudzu-based-bench/next-pages",
  trailingSlash: true,
  images: {
    // No next/image usage in this variant (plain <img>, matching the kudzu
    // markup this app ports), but output: "export" cannot run the default
    // image optimizer (it needs a live server), so this is required
    // regardless the moment next/image is used anywhere in the tree.
    unoptimized: true,
  },
  // The munja wasm that used to break this build no longer enters the graph:
  // search helpers moved to the @otw/notion-content/search subpath (build
  // scripts only), so pages that import fetchNewsEntries never pull wasm into
  // the Turbopack bundle.
};

export default nextConfig;
