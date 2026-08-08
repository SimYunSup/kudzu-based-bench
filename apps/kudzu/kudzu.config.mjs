// Project-page deployment: this app is served from
// https://simyunsup.github.io/kudzu-based-bench/kudzu/ alongside the
// other framework variants. `base` prefixes runtime, handler, stylesheet, and
// icon URLs (see src/lib/site.ts for the matching constant used to prefix
// hand-authored <a href> links, which base does not rewrite automatically).
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fetchNewsEntries } from "@otw/notion-content";
import { entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content/search";

const require = createRequire(import.meta.url);

export default {
  base: "/kudzu-based-bench/kudzu",

  // Munja search is vanilla-ESM only (see public/search.js) — kudzu's TSX
  // compiler rejects vendored npm packages and wasm imports inside page
  // handlers, so the index and the wasm-pack browser bundle are written here
  // instead of through a compiled component.
  async afterBuild({ outDir }) {
    // Reuses the process-wide fetchNewsEntries() memoization (keyed by
    // auth+databaseId) already populated while rendering pages above, so
    // this issues no extra Notion queries.
    const entries = await fetchNewsEntries();
    writeSearchIndexFile(entriesToSearchDocs(entries), join(outDir, "index.bin"));

    // Copy munja's wasm-pack (`--target web`) browser glue + wasm binary
    // next to the site's other static assets. require.resolve follows the
    // package's "main"/exports subpath, and the destination filenames match
    // what the glue itself expects to find alongside it
    // (`new URL("munja_bg.wasm", import.meta.url)`).
    const munjaDir = join(outDir, "munja");
    mkdirSync(munjaDir, { recursive: true });
    copyFileSync(require.resolve("@pickhealer/munja"), join(munjaDir, "munja.js"));
    copyFileSync(require.resolve("@pickhealer/munja/munja_bg.wasm"), join(munjaDir, "munja_bg.wasm"));
  }
};
