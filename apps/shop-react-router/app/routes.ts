import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("search", "routes/search.tsx"),
  route("search/:collection", "routes/search-collection.tsx"),
  route("product/:handle", "routes/product.tsx"),
  route("checkout", "routes/checkout.tsx"),
  // Catch-all policy pages (shipping, returns) — static routes above always
  // win the match against this single dynamic segment.
  route(":page", "routes/policy.tsx")
] satisfies RouteConfig;
