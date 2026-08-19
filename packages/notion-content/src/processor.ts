import { toc as rehypeToc } from "@jsdevtools/rehype-toc";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
// @ts-ignore -- notion-rehype-k ships no type declarations
import notionRehype from "notion-rehype-k";
import rehypeKatex from "rehype-katex";
import bookmarkPlugin from "./bookmark-plugin.js";
import normalizeProperties from "./normalize-properties.js";
import { extractTocHeadings } from "./toc.js";
import type { NewsHeading } from "./types.js";

// NOTE: Mirrors notion-loader/src/render.ts's processor construction,
// including its `(base as any)()` "freeze and reuse" step — chaining this
// many rehype plugins with divergent/missing types makes unified's
// inferred Processor type balloon, so the base pipeline (parse + katex +
// stringify) is built once with full type-checking, then re-instantiated
// per render with `.use(rehypeToc, ...)` and the bookmark plugin appended
// under `any`.
const baseProcessor = unified()
  .use(
    // @ts-ignore -- notion-rehype-k ships no type declarations
    notionRehype,
    { enableBlockId: true }
  ) // Parse Notion blocks to a hast tree
  // notion-rehype-k's list wrappers carry no `properties`, which rehype-katex
  // dereferences unguarded — normalize before it runs, never after.
  .use(normalizeProperties)
  .use(
    // @ts-ignore -- rehype-katex's plugin signature doesn't line up with this chain
    rehypeKatex
  )
  .use(rehypeStringify); // Turn hast into an HTML string

/**
 * Build a fresh processor for a single page render.
 *
 * A new instance is created per call (rather than sharing one processor
 * with a single mutable `headings` closure across concurrent renders, as
 * notion-loader's render.ts does) so headings extracted via `customizeTOC`
 * can never leak between pages rendered around the same time.
 */
export function createProcessor() {
  let headings: NewsHeading[] = [];

  const processor = (baseProcessor as any)()
    .use(rehypeToc, {
      customizeTOC(toc: any) {
        headings = extractTocHeadings(toc);
        return false;
      },
    })
    .use(bookmarkPlugin);

  return {
    async process(blocks: unknown): Promise<{ html: string; headings: NewsHeading[] }> {
      const vFile = await processor.process({ data: blocks });
      return { html: vFile.toString(), headings };
    },
  };
}
