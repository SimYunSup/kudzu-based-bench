import type { DocPage } from "@otw/docs-data";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * @otw/docs-data bodies only ever contain three block shapes — plain
 * paragraphs, "## " h2 headings, and ```lang fenced code blocks, each
 * separated by a blank line — so a full markdown parser is unnecessary. This
 * also lets heading ids line up exactly with `page.headings` (order-matched)
 * instead of re-deriving a slug that could drift from the corpus's own ids.
 */
export function renderBody(page: DocPage): string {
  const blocks = page.body.split("\n\n");
  const html: string[] = [];
  let headingIndex = 0;

  for (const block of blocks) {
    if (block.startsWith("## ")) {
      const heading = page.headings[headingIndex];
      headingIndex += 1;
      const id = heading ? heading.id : `${page.slug}-h${headingIndex}`;
      html.push(`<h2 id="${id}">${escapeHtml(block.slice(3).trim())}</h2>`);
      continue;
    }
    if (block.startsWith("```")) {
      const lines = block.split("\n");
      const lang = lines[0]!.slice(3).trim();
      const code = lines.slice(1, -1).join("\n");
      html.push(`<pre><code class="language-${lang || "text"}">${escapeHtml(code)}</code></pre>`);
      continue;
    }
    html.push(`<p>${escapeHtml(block)}</p>`);
  }

  return html.join("\n");
}
