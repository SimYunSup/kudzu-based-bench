import type { Config } from "@react-router/dev/config";
import { fetchNewsEntries } from "@otw/notion-content";
import { PAGE_SIZE } from "./app/lib/pagination";

export default {
  // GitHub Pages can't run SSR — fully static prerender.
  ssr: false,
  basename: "/kudzu-based-bench/react-router/",
  async prerender() {
    const entries = await fetchNewsEntries();

    // No Notion credentials at build time: still ship a valid, empty archive.
    if (entries.length === 0) {
      return ["/", "/news/list/1"];
    }

    const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const listPaths = Array.from(
      { length: pageCount },
      (_, i) => `/news/list/${i + 1}`,
    );
    const postPaths = entries.map((entry) => `/news/post/${entry.id}`);

    return ["/", ...listPaths, ...postPaths];
  },
} satisfies Config;
