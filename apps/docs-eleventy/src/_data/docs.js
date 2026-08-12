import { getDocs, resolveDocsSize } from "@otw/docs-data";

// Deterministic "Vine" documentation corpus, sized via OTW_DOCS_SIZE (see
// @otw/docs-data's doc comment) — same content every docs-* variant
// renders, build-time only, no network/filesystem. Computed once at module
// load (this file's default export function is called once per build), not
// per-invocation, since the corpus never changes mid-build.
const corpus = getDocs(resolveDocsSize(process.env.OTW_DOCS_SIZE));

// First page per section (ascending `order`, i.e. corpus.pages' own
// grouping), precomputed here rather than in Nunjucks: Nunjucks' for/if
// scoping doesn't cleanly support a "first match" accumulator across loop
// iterations. Feeds the homepage's six `.section-card` links.
const firstSlugBySection = new Map();
for (const page of corpus.pages) {
  if (!firstSlugBySection.has(page.section)) firstSlugBySection.set(page.section, page.slug);
}

export default function () {
  return {
    sections: corpus.sections,
    pages: corpus.pages,
    sectionEntry: corpus.sections.map((section) => ({
      ...section,
      firstSlug: firstSlugBySection.get(section.handle) ?? ""
    }))
  };
}
