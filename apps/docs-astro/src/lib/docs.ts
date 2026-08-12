import { getDocs, resolveDocsSize } from "@otw/docs-data";
import type { DocPage } from "@otw/docs-data";

// Build-time only: OTW_DOCS_SIZE controls the corpus size for every variant,
// same env var, same resolution rule (see @otw/docs-data).
export const corpus = getDocs(resolveDocsSize(process.env.OTW_DOCS_SIZE));

/** App-relative (no base) route for a doc page — pass through withBase() to link. */
export function docHref(page: DocPage): string {
  return `/guide/${page.section}/${page.slug}/`;
}

/** Prev/next pair in global reading order, for the pager at the bottom of a doc page. */
export function neighbors(page: DocPage): { prev?: DocPage; next?: DocPage } {
  return {
    prev: corpus.pages.find(candidate => candidate.order === page.order - 1),
    next: corpus.pages.find(candidate => candidate.order === page.order + 1)
  };
}
