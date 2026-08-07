// `basePath` prefixes next/link hrefs and Next's own asset URLs, but not
// hand-authored <img src> values coming out of the catalog data. Those go
// through here so both variants emit the same absolute paths.
export const BASE = "/ones-to-watch-refactor-test/shop-next-app";

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
