import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fetchNewsEntries } from "@otw/notion-content";
import { PAGE_SIZE } from "./src/lib/pagination";

// Static GitHub Pages deploy: the whole build is served from one artifact
// at https://simyunsup.github.io/kudzu-based-bench/, with this
// variant mounted under the /tanstack/ sub-path. GitHub Pages can't rewrite
// requests, so every route must be emitted as a real static HTML file —
// there is no SSR/edge runtime to fall back on at request time.
const BASE = "/kudzu-based-bench/tanstack/";
const ROUTER_BASEPATH = "/kudzu-based-bench/tanstack";

// Build the exact set of pages the prerenderer must visit. `crawlLinks` (see
// below) would eventually reach every post by following home -> "전체 보기"
// -> archive pager -> post-card links, but listing them explicitly here is
// both faster (no serial crawl chain through N archive pages) and gives us a
// guaranteed page 1 even with zero Notion entries (no credentials at build
// time still yields a valid, empty archive per the notion-content contract).
async function buildPrerenderPages(): Promise<Array<{ path: string }>> {
  const entries = await fetchNewsEntries();

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const listPaths = Array.from(
    { length: pageCount },
    (_, i) => `/news/list/${i + 1}`,
  );
  const postPaths = entries.map((entry) => `/news/post/${entry.id}`);

  return ["/", ...listPaths, ...postPaths].map((path) => ({ path }));
}

export default defineConfig(async () => ({
  base: BASE,
  plugins: [
    tanstackStart({
      router: {
        basepath: ROUTER_BASEPATH,
      },
      // Fully static prerender — no server runtime ships with the build.
      prerender: {
        enabled: true,
        // Still crawl outbound links as a safety net: any route reachable
        // only via pagination or a card link that we somehow missed in the
        // explicit list below is still discovered and emitted.
        crawlLinks: true,
      },
      pages: await buildPrerenderPages(),
    }),
    viteReact(),
  ],
}));
