// Astro does not rewrite arbitrary `href`/`src` values against `base` the way
// Next's `basePath` rewrites `next/link` and `next/image` — every app-absolute
// path has to be prefixed by hand. `import.meta.env.BASE_URL` mirrors
// `astro.config.mjs`'s `base` so the two can never drift apart.
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
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
