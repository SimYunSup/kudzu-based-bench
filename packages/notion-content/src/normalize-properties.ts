import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Give every element the `properties` field hast requires.
 *
 * `notion-rehype-k` emits its list wrappers (`<ul>`, `<ol>`) with no
 * `properties` at all, which is invalid hast — the field is mandatory on
 * `Element`. rehype-katex 7 reads `element.properties.className` unguarded
 * (`rehype-katex/lib/index.js:45`), so the first bulleted or numbered list on a
 * page throws `Cannot read properties of undefined (reading 'className')` and
 * `renderPage` drops the whole post. Nearly every post has a list, so the
 * published payload collapsed to a handful of entries.
 *
 * Runs before rehype-katex, and is mirrored in notion-loader/src/render.ts,
 * which builds the same pipeline for the astro variant.
 */
export default function normalizeProperties() {
  return function (tree: Root) {
    visit(tree, "element", (node: Element) => {
      if (!node.properties) node.properties = {};
    });
  };
}
