// `basePath` prefixes router links automatically, but not hand-authored
// <img src> values coming out of the catalog data. Those go through here so
// every variant emits the same absolute paths.
export const BASE = "/kudzu-based-bench/shop-tanstack";

export function assetUrl(path: string): string {
  return `${BASE}/${path.replace(/^\//, "")}`;
}

export function formatPrice(amount: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}

/** Cart lines are shared with the other variants through this key. */
export const CART_KEY = "otw-cart";

export interface CartLine {
  handle: string;
  color: string;
  size: string;
  title: string;
  quantity: number;
}
