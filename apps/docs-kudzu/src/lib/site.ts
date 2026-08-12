// Kudzu's `base` (kudzu.config.mjs) rewrites framework-owned URLs (runtime,
// handlers, styles), not hand-authored <a href> or <script src> values.
// Those go through here. Kudzu also rejects function calls inside JSX
// expressions, so every call site must resolve to a plain string at module
// scope or inside getStaticPaths(), never directly in returned JSX.
const BASE = "/kudzu-based-bench/docs-kudzu";

export function siteUrl(path: string): string {
  return `${BASE}/${path.replace(/^\//, "")}`;
}
