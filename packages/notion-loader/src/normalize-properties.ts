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
 * the render of that page fails.
 *
 * Runs before rehype-katex, and is mirrored in
 * notion-content/src/normalize-properties.ts, which builds the same pipeline
 * for the non-astro variants.
 */
export default function normalizeProperties() {
  return function (tree: Root) {
    visit(tree, "element", (node: Element) => {
      if (!node.properties) node.properties = {};
    });
  };
}
