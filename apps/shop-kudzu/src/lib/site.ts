// Kudzu's `base` rewrites framework-owned URLs (runtime, handlers, styles),
// not hand-authored <a href> or <img src> values. Those go through here.
//
// Kudzu rejects function calls inside JSX expressions, so every call site
// must resolve to a plain string at module scope or in a page prop.
const BASE = "/ones-to-watch-refactor-test/shop-kudzu";

export function siteUrl(path: string): string {
  return `${BASE}/${path.replace(/^\//, "")}`;
}

export const CURRENCY = "KRW";

/**
 * Fixed-locale currency formatting. Kudzu supports
 * `new Intl.NumberFormat("literal").format(...)` in reactive text, and this
 * mirrors that shape for build-time formatting so both paths agree.
 */
export function formatPrice(amount: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}
