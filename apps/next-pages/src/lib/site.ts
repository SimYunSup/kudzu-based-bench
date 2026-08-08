// next.config.mjs's `basePath` prefixes next/link, next/image, and
// next/head-generated URLs automatically, but it does not rewrite
// hand-authored asset paths — the search.js <script> src, the favicon
// <link>, or (inside public/search.js itself) the munja wasm import and
// index.bin fetch. See https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath.
// Every such reference in this app uses this constant instead.
export const BASE_PATH = "/kudzu-based-bench/next-pages";

export function assetUrl(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\//, "")}`;
}
