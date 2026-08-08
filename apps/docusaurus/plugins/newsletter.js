// Custom Docusaurus content plugin: fetches the shared Notion newsletter
// data once and turns it into every route this site serves (home, paginated
// archive, post detail) plus the munja search assets, entirely through the
// documented plugin Lifecycle API
// (https://docusaurus.io/docs/api/plugin-methods/lifecycle-apis):
//
//   loadContent()              -> fetch data (once per build)
//   contentLoaded({actions})   -> actions.createData() + actions.addRoute()
//                                  turn that data into static routes
//   postBuild({content,outDir})-> write extra build artifacts (search index)
//
// This mirrors the official "friends plugin" example in that doc almost
// exactly, just with Notion entries standing in for the hardcoded friends
// list, and pagination/detail routes added on top of the single example
// route shown there.
import { mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fetchNewsEntries } from "@otw/notion-content";
import { entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content/search";

const require = createRequire(import.meta.url);
const PAGE_SIZE = 12;

function toCardData(entry) {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    coverUrl: entry.coverUrl
  };
}

// Docusaurus mounts its client <BrowserRouter> without a `basename` (see
// @docusaurus/core client/clientEntry.js), so on hydration the router matches
// routes against the FULL window.location.pathname — which includes baseUrl
// (here "/kudzu-based-bench/docusaurus/"). Route paths handed to
// addRoute must therefore be baseUrl-prefixed, exactly like the built-in
// content plugins (which build paths via normalizeUrl([baseUrl, ...])) and like
// the useBaseUrl() calls the route components already apply to every internal
// <a> href. Left unprefixed, "/" and "/news/list/N" never match the served URL,
// so every page falls through to the catch-all "*" (@theme/NotFound) — the home
// URL rendered the 404 body, which reuses the "archive" class, surfacing as the
// React #418 server/client hydration mismatch. baseUrl always carries a trailing
// slash (Docusaurus normalizes it), so this is a plain concat after dropping the
// route's leading slash; "/" maps to baseUrl itself (the root route core's
// sortRoutes expects at `path === baseUrl`).
function withBaseUrl(baseUrl, routePath) {
  return baseUrl + routePath.replace(/^\//, "");
}

export default function newsletterPlugin(context) {
  const { baseUrl } = context;
  return {
    name: "newsletter-plugin",

    // fetchNewsEntries() memoizes process-wide (keyed by auth+databaseId),
    // so postBuild below reuses this same result via its `content` arg
    // instead of re-fetching — see apps/kudzu/kudzu.config.mjs afterBuild
    // for the identical assumption in the reference variant. Returns []
    // (never throws) when Notion secrets are absent, so a route set with
    // just a single empty archive page is always produced below.
    async loadContent() {
      return fetchNewsEntries();
    },

    async contentLoaded({ content: entries, actions }) {
      const { createData, addRoute } = actions;
      const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

      const homeDataPath = await createData(
        "home.json",
        JSON.stringify({ cards: entries.slice(0, 8).map(toCardData) })
      );
      addRoute({
        path: withBaseUrl(baseUrl, "/"),
        component: "@site/src/routes/HomePage.tsx",
        modules: { data: homeDataPath },
        exact: true
      });

      // Archive pages, 12 entries each, 1-based — always at least page 1,
      // even with zero entries, so an empty collection still builds a
      // browsable (if empty) archive route instead of a missing one.
      for (let page = 1; page <= pageCount; page += 1) {
        const cards = entries
          .slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page)
          .map(toCardData);
        const listDataPath = await createData(
          `news-list-${page}.json`,
          JSON.stringify({ page, pageCount, cards })
        );
        addRoute({
          path: withBaseUrl(baseUrl, `/news/list/${page}`),
          component: "@site/src/routes/ArchivePage.tsx",
          modules: { data: listDataPath },
          exact: true
        });
      }

      // Post detail routes. Notion page ids are UUIDs (hyphens only), which
      // are safe path segments, so no slug transform is needed — same
      // reasoning as apps/kudzu/src/pages/news/post/[slug].tsx.
      for (const entry of entries) {
        const postDataPath = await createData(
          `news-post-${entry.id}.json`,
          JSON.stringify({
            title: entry.title,
            date: entry.date,
            coverUrl: entry.coverUrl,
            html: entry.html
          })
        );
        addRoute({
          path: withBaseUrl(baseUrl, `/news/post/${entry.id}`),
          component: "@site/src/routes/PostPage.tsx",
          modules: { data: postDataPath },
          exact: true
        });
      }
    },

    // Munja search is a vanilla-ESM browser bundle (static/search.js, a
    // plain static asset — not compiled by this plugin), so — exactly like
    // apps/kudzu/kudzu.config.mjs afterBuild — the prebuilt search index and
    // wasm-pack glue it fetches at runtime are written directly here rather
    // than through a React/webpack asset pipeline.
    async postBuild({ content: entries, outDir }) {
      writeSearchIndexFile(entriesToSearchDocs(entries), path.join(outDir, "index.bin"));

      const munjaDir = path.join(outDir, "munja");
      await mkdir(munjaDir, { recursive: true });
      await copyFile(require.resolve("@pickhealer/munja"), path.join(munjaDir, "munja.js"));
      await copyFile(
        require.resolve("@pickhealer/munja/munja_bg.wasm"),
        path.join(munjaDir, "munja_bg.wasm")
      );
    }
  };
}
