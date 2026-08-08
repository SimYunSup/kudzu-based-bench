import type { Config } from "@react-router/dev/config";
import { catalog } from "./app/lib/catalog";

export default {
  // GitHub Pages can't run SSR — fully static prerender.
  ssr: false,
  basename: "/kudzu-based-bench/shop-react-router/",
  async prerender() {
    return [
      "/",
      "/search",
      ...catalog.collections.map(collection => `/search/${collection.handle}`),
      ...catalog.products.map(product => `/product/${product.handle}`),
      "/checkout",
      ...catalog.pages.map(page => `/${page.handle}`)
    ];
  }
} satisfies Config;
