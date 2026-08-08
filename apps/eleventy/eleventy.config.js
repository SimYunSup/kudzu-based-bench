// Eleventy (11ty v3) build config for the "eleventy" variant of the Ones To
// Watch newsletter site. See the cross-variant contract in the repo's
// design notes: same routes/data source as every other apps/* variant, the
// same kudzu-derived markup/CSS, the same footer variant switch, and the
// same munja search island.
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fetchNewsEntries } from "@otw/notion-content";
import { entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content/search";

const require = createRequire(import.meta.url);

export default function (eleventyConfig) {
  // ko-KR date formatting, ported verbatim from the `new
  // Intl.DateTimeFormat("ko-KR").format(...)` call inline in
  // apps/kudzu/src/components/PostCard.tsx, so post/card dates render
  // identically to every other variant.
  eleventyConfig.addFilter("koDate", (iso) => {
    if (!iso) return "";
    return new Intl.DateTimeFormat("ko-KR").format(new Date(iso));
  });

  // style.css / content.css / search.js / favicon.svg are plain static
  // files with no build step of their own. None of their extensions are in
  // Eleventy's default templateFormats, so without an explicit passthrough
  // entry they'd be silently ignored rather than copied to the output
  // (https://www.11ty.dev/docs/copy/#passthrough-by-file-extension). Entries
  // are relative to the project root but live under the "src" input
  // directory, so Eleventy strips that prefix and writes them to the output
  // root (e.g. `src/style.css` -> `_site/style.css`) — the same flat layout
  // kudzu's dist/ uses, which every hand-authored `site.base`-prefixed URL
  // in the templates below assumes.
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy("src/content.css");
  eleventyConfig.addPassthroughCopy("src/search.js");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");

  // Munja search island: write the full-text index and copy the wasm-pack
  // browser bundle into the output root once the build's HTML has been
  // written. Ported from apps/kudzu/kudzu.config.mjs's afterBuild hook.
  // `fetchNewsEntries()` reuses the same process-wide memoized promise
  // already populated by src/_data/news.js while rendering pages above
  // (keyed by auth+databaseId — see @otw/notion-content), so this issues no
  // extra Notion queries regardless of how many pages already called it.
  eleventyConfig.on("eleventy.after", async ({ directories }) => {
    const outDir = directories.output;
    const entries = await fetchNewsEntries();
    writeSearchIndexFile(entriesToSearchDocs(entries), join(outDir, "index.bin"));

    // Copy munja's wasm-pack (`--target web`) browser glue + wasm binary
    // next to the site's other static assets. require.resolve follows the
    // package's exports subpath, and the destination filenames match what
    // the glue itself expects to find alongside it (`new
    // URL("munja_bg.wasm", import.meta.url)`).
    const munjaDir = join(outDir, "munja");
    mkdirSync(munjaDir, { recursive: true });
    copyFileSync(require.resolve("@pickhealer/munja"), join(munjaDir, "munja.js"));
    copyFileSync(require.resolve("@pickhealer/munja/munja_bg.wasm"), join(munjaDir, "munja_bg.wasm"));
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },

    // Deployed under the shared GitHub Pages artifact's /eleventy/ subpath
    // alongside the other framework variants (see src/_data/site.js's
    // `base` constant, hand-applied to every <a href>/<script src>/asset
    // URL in the templates below).
    //
    // pathPrefix by itself only rewrites URLs that pass through Nunjucks'
    // `url` filter or the HtmlBasePlugin
    // (https://www.11ty.dev/docs/plugins/html-base/,
    // https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory) — it does
    // NOT touch plain `{{ ... }}` output or move where files land on disk
    // (https://www.11ty.dev/docs/copy/: passthrough copy is always relative
    // to the project root, independent of pathPrefix). This app uses
    // neither the filter nor the plugin: every internal link is instead
    // prefixed by hand via the `site.base` global data constant, matching
    // apps/kudzu/src/lib/site.ts's `siteUrl()` helper (kudzu's `base` field
    // doesn't rewrite hand-authored `<a href>` values either, for the same
    // reason). pathPrefix is still set here for correctness/tooling (it
    // affects `--serve`'s local subpath emulation and `page.url` metadata)
    // and to document the deployment target, matching kudzu's `base` field
    // and hugo's `baseURL`.
    pathPrefix: "/kudzu-based-bench/eleventy/"
  };
}
