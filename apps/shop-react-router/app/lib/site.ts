// `assetUrl` prefixes catalog image paths with the deploy base so they
// resolve when this variant is served from a GitHub Pages sub-path — the
// same contract every shop variant follows (see shop-next-app/src/lib/site.ts).
// Vite bakes `import.meta.env.BASE_URL` from vite.config.ts's `base`, so
// there is nothing to duplicate here.
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
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
