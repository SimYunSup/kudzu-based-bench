// Kudzu's `base` (kudzu.config.mjs) prefixes runtime/handler/stylesheet/icon
// URLs automatically, but it does not rewrite hand-authored <a href> values
// (confirmed against framework/core.mjs — pages receive no base prop, and
// build.mjs only threads `base` into renderPage's own metadata handling).
// Every internal link in this app must be prefixed with this constant.
export const BASE = "/kudzu-based-bench/kudzu";

export function siteUrl(path: string): string {
  return `${BASE}/${path.replace(/^\//, "")}`;
}
