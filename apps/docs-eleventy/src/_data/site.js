// Constant path prefix, hand-applied to every internal <a href>/<link
// href>/<script src> in this app's templates instead of Nunjucks' `url`
// filter or the HtmlBasePlugin — see eleventy.config.js's `pathPrefix`
// comment for why. Mirrors apps/eleventy/src/_data/site.js.
export default {
  base: "/kudzu-based-bench/docs-eleventy"
};
