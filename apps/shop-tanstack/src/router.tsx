import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// The router basepath is injected automatically at runtime from the
// `router.basepath` value configured in vite.config.ts (via the
// `TSS_ROUTER_BASEPATH` define, applied through `router.update({ basepath })`
// on both the server render path and client hydration path) — it does not
// need to be repeated here.
export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
  return router;
}
