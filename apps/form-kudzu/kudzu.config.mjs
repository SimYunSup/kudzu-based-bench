// Project-page deployment alongside the other benchmark variants.
// `base` prefixes runtime, handler, stylesheet, and icon URLs. Every
// internal link/action in this app is a relative path (the wizard is a
// native GET-form chain across sibling documents), so no `siteUrl()`-style
// helper is needed here the way apps/shop-kudzu needs one for its
// hand-authored <a href> values.
//
// No `navigation` group: form submissions are always full document
// navigations regardless of an opt-in same-document `navigation` group, so
// there is nothing for that group to buy here (see apps/shop-kudzu's
// kudzu.config.mjs for the catalog-scale case where it matters).
export default {
  base: "/kudzu-based-bench/form-kudzu"
};
