#!/usr/bin/env node
// Materialize the Vine docs corpus (@otw/docs-data) as real Markdown files
// under guide/<section>/<slug>.md.
//
// This has to happen before VitePress starts (dev) or scans srcDir (build):
// the corpus can't be consumed the way apps/vitepress/news/list/[page].md
// consumes @otw/notion-content, i.e. as a VitePress *dynamic route*
// ([page].md + [page].paths.ts) — a dynamic route always compiles down to
// one page per array entry returned by `paths()`, which fits a numbered
// pager but not "every corpus page gets its own guide/<section>/<slug>
// URL". Writing real files sidesteps that without giving up anything: VPs
// dynamic-route constraint that output is always a flat `<param>.html`
// (see README.md's VitePress fault #3, "동적 라우트는 디렉터리형 pretty
// URL을 만들 수 없음") applies to *every* Markdown file VitePress compiles,
// dynamic or not — a real guide/<section>/<slug>.md file still comes out
// as guide/<section>/<slug>.html, never .../index.html. .vitepress/config.ts
// sets `cleanUrls: true` for the same reason the sibling app does: it's the
// closest supported match (extension-less URL, no redirect needed on
// GitHub Pages) to the other variants' directory-form routes.
//
// Corpus size comes from OTW_DOCS_SIZE, resolved the same way every other
// docs-* variant resolves it (see @otw/docs-data's resolveDocsSize).
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDocs, resolveDocsSize } from "@otw/docs-data";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const guideDir = join(appDir, "guide");

const corpus = getDocs(resolveDocsSize(process.env.OTW_DOCS_SIZE));

// Regenerated on every dev/build run (see package.json's scripts) — wipe
// stale pages first so a shrunk OTW_DOCS_SIZE doesn't leave orphaned .md
// files that VitePress would otherwise still discover and build.
rmSync(guideDir, { recursive: true, force: true });

// YAML frontmatter needs its own escaping (a bare `"` or `\` would break the
// quoted scalar). The corpus's generated Korean prose never produces either
// today, but escaping defensively costs nothing and doesn't assume that
// stays true.
const yamlString = (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

for (const page of corpus.pages) {
  const dir = join(guideDir, page.section);
  mkdirSync(dir, { recursive: true });

  // The rendered `# <title>` heading below is this page's *only* h1 — it IS
  // the doc-title contract element (.vitepress/config.ts's `markdown.config`
  // hook tags every h1 markdown-it renders with class="doc-title"). page.body
  // already contains every `## heading` (see @otw/docs-data's DocPage.body
  // doc comment), which markdown-it renders as h2 with no extra work here.
  const md = `---\ntitle: ${yamlString(page.title)}\ndescription: ${yamlString(page.description)}\n---\n\n# ${page.title}\n\n${page.body}\n`;

  writeFileSync(join(dir, `${page.slug}.md`), md);
}

console.log(`gen-docs: ${corpus.pages.length} pages across ${corpus.sections.length} sections`);
