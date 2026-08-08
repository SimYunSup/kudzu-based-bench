// Constant path prefix, hand-applied to every internal <a href>/<script
// src>/asset URL in this app's templates instead of Nunjucks' `url` filter
// or the HtmlBasePlugin — see eleventy.config.js's `pathPrefix` comment for
// why. Mirrors apps/kudzu/src/lib/site.ts's BASE/siteUrl() pattern.
export default {
  base: "/kudzu-based-bench/eleventy",
  currentVariant: "eleventy",
  // Baked in at build time, same as `{new Date().getFullYear()}` in
  // apps/kudzu/src/components/Footer.tsx (also computed once, at build
  // time, since kudzu compiles to static HTML too).
  year: new Date().getFullYear()
};
