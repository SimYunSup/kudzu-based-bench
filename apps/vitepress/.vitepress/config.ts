// Static GitHub Pages deploy: the whole build is served from one artifact
// at https://simyunsup.github.io/kudzu-based-bench/, with this
// variant mounted under the /vitepress/ sub-path (matches
// apps/{react-router,tanstack-router}/vite.config.ts's `base` and
// apps/kudzu/kudzu.config.mjs's `base`).
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitepress";
import { fetchNewsEntries } from "@otw/notion-content";
import { entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content/search";

const require = createRequire(import.meta.url);

export default defineConfig({
  title: "Ones To Watch for FrontEnd",
  description: "매주 프론트엔드 소식을 정리해서 보내드립니다.",
  lang: "ko",
  base: "/kudzu-based-bench/vitepress/",

  // outDir left at the VitePress default (.vitepress/dist) — every other
  // variant's build output lives at a framework-default location too
  // (apps/kudzu/dist, apps/react-router/build/client, apps/tanstack-router/
  // dist/client), and the orchestrator's assemble step already copies each
  // app's own dist tree into site/<key>/, so there's no reason to relocate
  // this one.

  // cleanUrls: every other variant serves pretty, extension-less URLs as a
  // directory + index.html (e.g. site/kudzu/news/list/1/index.html served
  // at .../news/list/1/ — see scripts/lib/site-server.mjs's
  // resolveStaticFile, which falls back from a bare path to `${path}.html`
  // only as a secondary case). VitePress's dynamic routes always emit a
  // flat `<param>.html` file (never `<param>/index.html>` — confirmed
  // against vitepress@1.6.4's build/render.ts, `cleanUrls` never changes
  // the *output* path, only whether generated <a> hrefs carry `.html` and
  // whether the client router accepts an extension-less URL), so an exact
  // directory-form match isn't possible without renaming every dynamic
  // route file to `news/list/[page]/index.md` (undocumented for dynamic
  // routes in 1.6.4). `cleanUrls: true` is the closest supported match: it
  // makes every internal <a> and the client-side router use extension-less
  // paths, and GitHub Pages serves `/foo.html` at `/foo` without a redirect
  // by default (per https://vitepress.dev/guide/routing#generating-clean-urls
  // and the GitHub Pages deploy guide) — the resulting URLs
  // (`/vitepress/news/list/1`, no `/index.html`, no `.html`) are
  // functionally the same "pretty URL" contract the other variants expose,
  // just without the trailing slash. scripts/lib/site-server.mjs's
  // resolveStaticFile already supports this exact case as its secondary
  // fallback (`${absPath}.html`), so the local dev/e2e server also serves
  // it correctly with no changes there.
  cleanUrls: true,

  // No `sitemap` option is set — generateSitemap() is a no-op unless
  // `sitemap.hostname` is configured (vitepress@1.6.4 build/generateSitemap.ts
  // returns immediately otherwise), so this omission *is* "sitemap off".
  // No `themeConfig.search` either: that option only wires up the default
  // theme's DocSearch/local-search UI, which this custom theme (no
  // `extends`) never renders — munja (public/search.js) is the only search
  // implementation shipped, matching every other variant.

  // VitePress's `head` option does not auto-prepend `base` to href/src
  // values (only Markdown-authored links get that treatment) — the
  // reference example in the site-config docs itself instructs "if base is
  // set, use /base/favicon.ico" — so this is written out in full rather
  // than relying on the `/`-prefix auto-rewrite other options (e.g.
  // `rewrites`) get.
  head: [
    [
      "link",
      { rel: "icon", href: "/kudzu-based-bench/vitepress/favicon.svg", type: "image/svg+xml" },
    ],
  ],

  // Frontmatter carries a static placeholder `title` (Markdown frontmatter
  // is plain YAML — it can't interpolate `$params` the way a rendered
  // Markdown *body* can) for the two dynamic routes; the real per-page
  // title comes from their `.paths.ts` params instead.
  transformPageData(pageData) {
    const params = pageData.params as
      | { docTitle?: string; title?: string }
      | undefined;
    if (!params) return;
    if (pageData.relativePath.startsWith("news/list/")) {
      pageData.title = params.docTitle;
    } else if (pageData.relativePath.startsWith("news/post/")) {
      pageData.title = `${params.title} | OTW for FE`;
    }
  },

  // Munja search is a vanilla-ESM script (public/search.js), so — like
  // apps/kudzu/kudzu.config.mjs's afterBuild — the index and the
  // wasm-pack browser bundle are written here as a plain post-build step
  // instead of through a compiled Vue component. Kept inline rather than
  // split into a scripts/prepare-data.mjs (contrast with the non-Node SSGs
  // in the other Hugo/Lume sibling apps): VitePress's config file and
  // buildEnd hook already run in plain Node with siteConfig.outDir resolved
  // for us, so a separate script would only add a second process spawn and
  // a second (redundant, if unmemoized) fetchNewsEntries() call path for no
  // benefit — buildEnd already runs after every page (including the
  // dynamic routes' own fetchNewsEntries() calls) has rendered.
  async buildEnd(siteConfig) {
    const entries = await fetchNewsEntries();
    writeSearchIndexFile(entriesToSearchDocs(entries), join(siteConfig.outDir, "index.bin"));

    // Copy munja's wasm-pack (`--target web`) browser glue + wasm binary
    // next to the site's other static assets. require.resolve follows the
    // package's "main"/exports subpath, and the destination filenames match
    // what the glue itself expects to find alongside it
    // (`new URL("munja_bg.wasm", import.meta.url)`) — same layout
    // public/search.js's import specifier and fetch() calls expect.
    const munjaDir = join(siteConfig.outDir, "munja");
    mkdirSync(munjaDir, { recursive: true });
    copyFileSync(require.resolve("@pickhealer/munja"), join(munjaDir, "munja.js"));
    copyFileSync(require.resolve("@pickhealer/munja/munja_bg.wasm"), join(munjaDir, "munja_bg.wasm"));
  },
});
