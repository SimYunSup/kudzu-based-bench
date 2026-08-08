import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { buildCatalog, catalogSizeFromEnv } from "@otw/commerce-data";

// Static deploy, same shape as the other variants in this benchmark: the
// whole build is served from one artifact, with this app mounted under its
// own sub-path. No server runtime ships — every route must be a real static
// HTML file at build time.
const BASE = "/kudzu-based-bench/shop-tanstack/";
const ROUTER_BASEPATH = "/kudzu-based-bench/shop-tanstack";

// Catalog size is read from the same env var as every other variant so the
// build-scaling track can sweep it uniformly.
const catalog = buildCatalog(catalogSizeFromEnv(process.env.OTW_CATALOG_SIZE));

// Enumerate every route explicitly rather than relying solely on link
// crawling: it guarantees the full product/collection matrix is emitted
// even if a page is unreachable by outbound links (e.g. products beyond the
// 48-tile /search listing limit).
function buildPrerenderPages(): Array<{ path: string }> {
  const searchPaths = catalog.collections.map((collection) => `/search/${collection.handle}`);
  const productPaths = catalog.products.map((product) => `/product/${product.handle}`);
  const policyPaths = catalog.pages.map((page) => `/${page.handle}`);

  return ["/", "/search", ...searchPaths, ...productPaths, ...policyPaths, "/checkout"].map(
    (path) => ({ path }),
  );
}

export default defineConfig({
  base: BASE,
  // The harness probes for a directory named `dist`/`out`/`build/client`
  // containing `index.html` at its root. Start's default multi-environment
  // build nests the static client output under `dist/client` (with the
  // Nitro-less server bundle at `dist/server`) — pin the client environment's
  // outDir back to the repo-wide `dist` convention every other variant uses.
  environments: {
    client: {
      build: {
        outDir: "dist",
      },
    },
  },
  plugins: [
    tanstackStart({
      router: {
        basepath: ROUTER_BASEPATH,
      },
      // Fully static prerender — no server runtime ships with the build.
      prerender: {
        enabled: true,
        // Safety net for anything reachable only via an in-page link (e.g.
        // header menu, collection cards) that the explicit list above missed.
        crawlLinks: true,
      },
      pages: buildPrerenderPages(),
    }),
    viteReact(),
  ],
});
