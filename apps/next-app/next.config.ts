import type { NextConfig } from "next";

// Project-page deployment: this app is served from
// https://simyunsup.github.io/kudzu-based-bench/next-app/ alongside
// the other framework variants. `basePath` prefixes `next/link` hrefs,
// `next/image` src, and Next's own /_next/* asset URLs automatically, but
// not hand-authored asset paths (the search.js <script> src, the favicon
// <link>, or the fetch()/import specifiers inside public/search.js itself)
// — see src/lib/site.ts for the matching constant those use instead.
// https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath
//
// `output: "export"` + `trailingSlash: true` makes `next build` write plain
// static HTML/CSS/JS to out/ (each route as `<path>/index.html`), which is
// what a directory-listing static host like GitHub Pages needs — there is no
// Node server at runtime to fall back to. This is also why every dynamic
// route's generateStaticParams below must enumerate every path it wants
// built: `output: "export"` throws `Page "..." is missing
// "generateStaticParams()" so it cannot be used with "output: export"
// config.` for any dynamic route whose generateStaticParams resolves to zero
// entries (verified against packages/next/src/build/index.ts's
// `hasGenerateStaticParams` check, which is `prerenderedRoutes.length > 0`
// — an empty array trips the same throw as no function at all). See
// src/app/news/post/[id]/page.tsx for how the empty-collection case is
// handled.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/kudzu-based-bench/next-app",
  trailingSlash: true,
  // Required for static export: the default next/image loader needs a live
  // Node.js image-optimization server that doesn't exist in `out/` (docs:
  // "How to create a static export", Supported Features > Image
  // Optimization). No next/image usage in this variant (plain <img>,
  // matching the kudzu markup this app ports), but the config is invalid
  // under output: "export" without this regardless.
  images: {
    unoptimized: true,
  },
  // Turbopack infers the workspace root from the nearest lockfile; with the
  // monorepo's pnpm-lock two levels up that inference is correct, so no
  // turbopack.root pin is needed. The munja wasm that used to break this
  // build no longer enters the graph: search helpers moved to the
  // @otw/notion-content/search subpath (build scripts only), so pages that
  // import fetchNewsEntries never pull wasm into the Turbopack bundle.
};

export default nextConfig;
