// Project-page deployment: this app is served from
// https://simyunsup.github.io/kudzu-based-bench/vitepress/ alongside
// the other framework variants. VitePress's `base` (.vitepress/config.ts)
// auto-prefixes every internal `<a>` VitePress itself renders from Markdown
// links, but our theme components build hrefs as plain strings (footer
// variant switcher, PostCard, pager) — those need the prefix applied by
// hand. Mirrors apps/kudzu/src/lib/site.ts.
export const BASE = "/kudzu-based-bench/vitepress";

export function siteUrl(path: string): string {
  return `${BASE}/${path.replace(/^\//, "")}`;
}
