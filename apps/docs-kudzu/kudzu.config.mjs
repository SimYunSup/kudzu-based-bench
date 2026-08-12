// Project-page deployment alongside the other benchmark variants.
// `base` prefixes runtime, handler, stylesheet, and icon URLs; hand-authored
// <a href> values are prefixed through src/lib/site.ts instead.
//
// No `navigation` group on purpose. Kudzu's opt-in same-document navigation
// requires every member route to be listed here and to resolve to one
// globally unique *emitted* route. A `getStaticPaths()` catalog emits one
// /guide/<section>/<slug> document per corpus page (count follows
// OTW_DOCS_SIZE), not a "/guide/[section]/[slug]" pattern — same reasoning
// apps/shop-kudzu documents for its product catalog. The docs site therefore
// uses Kudzu's default: native document navigation, every route a complete
// standalone document. That is also the like-for-like comparison against
// the other static doc-site variants.
//
// No `afterBuild` hook either: Pagefind indexes the finished dist/ output
// after Kudzu writes it, so it runs as a plain chained step in the "build"
// script (see package.json) rather than through this config.
export default {
  base: "/kudzu-based-bench/docs-kudzu"
};
