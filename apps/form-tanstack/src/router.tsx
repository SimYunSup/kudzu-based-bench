import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Native GET form submission (checkbox groups in particular) repeats a key
// once per checked value, e.g. `diet=vegan&diet=vegetarian`. The router's
// default JSON-flavoured search codec collapses repeats to the last value,
// which would silently corrupt the `diet` field and desync the /done/ ref
// code from the other variants — so parsing/stringifying is pinned to a
// scheme that mirrors `URLSearchParams#getAll` exactly: a key seen once
// stays a plain string, a key repeated becomes an array in source order.
// Passed to the router directly, NOT through parseSearchWith /
// stringifySearchWith: those helpers wrap a per-VALUE reviver (JSON.parse
// style) around the default URLSearchParams split, so wrapping a
// whole-query-string parser with them double-processes the query and
// mangles it (observed: `?name=…&type=team` rewritten to
// `?type=individual%3D` on hydration).
function parseWizardSearch(raw: string): Record<string, unknown> {
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const result: Record<string, unknown> = {};
  for (const key of params.keys()) {
    if (key in result) continue;
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}

function stringifyWizardSearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) {
      params.append(key, String(entry));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

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
    parseSearch: parseWizardSearch,
    stringifySearch: stringifyWizardSearch,
  });
  return router;
}
