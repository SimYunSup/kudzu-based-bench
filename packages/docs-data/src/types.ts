export interface DocSection {
  /** URL segment, e.g. "routing". */
  handle: string;
  title: string;
  description: string;
}

export interface DocHeading {
  /** Anchor id, e.g. "routing-03-h1". */
  id: string;
  text: string;
}

export interface DocPage {
  /** URL segment inside the section, e.g. "routing-03". */
  slug: string;
  /** Section handle this page belongs to. */
  section: string;
  title: string;
  description: string;
  /** h2 headings, in document order. Anchors are stable. */
  headings: DocHeading[];
  /**
   * Markdown body. h2 headings are included inline (## …) so a variant can
   * either render the string as-is or rebuild structure from `headings`.
   */
  body: string;
  /** 0-based position in the global prev/next ordering. */
  order: number;
}

export interface DocsCorpus {
  sections: DocSection[];
  /** Global reading order: section order, then slug order. */
  pages: DocPage[];
}
