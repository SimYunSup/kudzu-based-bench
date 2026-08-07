// Project-page deployment alongside the other benchmark variants.
// `base` prefixes runtime, handler, stylesheet, and icon URLs; hand-authored
// <a href> values are prefixed through src/lib/site.ts instead.
import { join } from "node:path";
import { writeCatalogImages } from "@otw/commerce-data/images";

// No `navigation` group on purpose. Kudzu's opt-in same-document navigation
// requires every member route to be listed in this config and to resolve to
// one globally unique *emitted* route. A `getStaticPaths()` catalog emits
// /product/p-00000 … /product/p-09999, not a "/product/[handle]" pattern
// (that form is reserved for `runtimeParams` routes), so enrolling the
// catalog would mean enumerating every product here. The storefront therefore
// uses Kudzu's default: native document navigation, every route a complete
// standalone document. That is also the like-for-like comparison against the
// other static variants.
export default {
  base: "/ones-to-watch-refactor-test/shop-kudzu",

  // The 12 catalog images are generated, not committed, so every variant
  // writes byte-identical files. Pages may not import packages, but the
  // config module is ordinary Node.
  async afterBuild({ outDir }) {
    writeCatalogImages(join(outDir, "commerce"));
  }
};
