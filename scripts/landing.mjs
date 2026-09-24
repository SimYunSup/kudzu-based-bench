#!/usr/bin/env node
/**
 * Landing pages rendered from the README.
 *
 * The README is where results and the reasons behind them are written and
 * reviewed; the landing page is where most readers arrive. Instead of keeping
 * a second copy of that prose in HTML that drifts the first time a bench is
 * re-run, this renders the part of each README between
 * `<!-- landing:start -->` and `<!-- landing:end -->` into the matching
 * landing shell, between its `<!-- readme:start -->` and `<!-- readme:end -->`
 * markers, together with a contents list built from the same headings:
 *
 *   README.md     -> landing/index.html     (Korean, site root)
 *   README.en.md  -> landing/en/index.html  (English, /en/)
 *
 * What changes on the way:
 *   - Chart paths (`assets/charts/<lang>/…`) point at `charts/<lang>/…`,
 *     which `assembleSite()` copies next to the landing pages.
 *   - Repository-relative links point at the file on GitHub.
 *   - Headings keep GitHub's anchor slugs, so the README's own `#…` links
 *     resolve on the page as well.
 *   - Tables get a scroll container so wide ones stay usable on phones.
 *
 * The output is a pure function of the READMEs and the shells: an unchanged
 * README regenerates byte-identical pages. `scripts/deploy-pages.mjs` runs
 * this before assembling the site; run it by hand after editing a README.
 *
 * Usage:
 *   node scripts/landing.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import { gfmHeadingId, getHeadingList } from "marked-gfm-heading-id";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const REPO_BLOB = "https://github.com/SimYunSup/kudzu-based-bench/blob/main/";
const CHARTS_DIR = "assets/charts/";

/** `siteRoot` is the relative path from the page back to the site root. */
const PAGES = [
  { readme: "README.md", shell: "landing/index.html", siteRoot: "", contents: "목차" },
  { readme: "README.en.md", shell: "landing/en/index.html", siteRoot: "../", contents: "Contents" }
];

/** Split `text` around the one `start` … `end` marker pair it must contain. */
function splitAtMarkers(text, start, end, file) {
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from === -1 || to < from || text.indexOf(start, from + 1) !== -1) {
    throw new Error(`${file}: expected exactly one ${start} … ${end} pair`);
  }
  return { before: text.slice(0, from + start.length), inner: text.slice(from + start.length, to), after: text.slice(to) };
}

const escapeHtml = value =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Anything with a scheme, an in-page anchor, or a root-absolute path is left alone. */
const isRelative = href => !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(href);

function relocate(href, siteRoot) {
  const clean = href.replace(/^\.\//, "");
  return clean.startsWith(CHARTS_DIR) ? `${siteRoot}charts/${clean.slice(CHARTS_DIR.length)}` : REPO_BLOB + clean;
}

/** h2 entries with their h3 children, linked by the same slugs the headings carry. */
function contentsList(headings, title) {
  const items = [];
  for (const heading of headings) {
    const entry = `<a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.raw)}</a>`;
    if (heading.level === 2) items.push({ entry, children: [] });
    else if (heading.level === 3 && items.length) items.at(-1).children.push(entry);
  }
  const list = items
    .map(({ entry, children }) =>
      children.length ? `<li>${entry}<ol>${children.map(child => `<li>${child}</li>`).join("")}</ol></li>` : `<li>${entry}</li>`
    )
    .join("");
  return `<nav class="toc" aria-label="${escapeHtml(title)}"><p class="toc-title">${escapeHtml(title)}</p><ol>${list}</ol></nav>`;
}

function render(markdown, page) {
  const marked = new Marked({ gfm: true });
  marked.use(gfmHeadingId());
  marked.use({
    walkTokens(token) {
      if ((token.type === "link" || token.type === "image") && isRelative(token.href)) {
        token.href = relocate(token.href, page.siteRoot);
      }
    }
  });
  const body = marked
    .parse(markdown)
    // The README embeds its charts as raw <img> tags so it can set a width;
    // marked passes raw HTML through untouched, so those paths move here.
    .replaceAll(`src="${CHARTS_DIR}`, `src="${page.siteRoot}charts/`)
    .replaceAll("<table>", '<div class="table-scroll"><table>')
    .replaceAll("</table>", "</table></div>");
  return `${contentsList(getHeadingList(), page.contents)}\n${body}`;
}

for (const page of PAGES) {
  const readme = readFileSync(path.join(repoRoot, page.readme), "utf8");
  const { inner: markdown } = splitAtMarkers(readme, "<!-- landing:start -->", "<!-- landing:end -->", page.readme);
  const shellPath = path.join(repoRoot, page.shell);
  const shell = readFileSync(shellPath, "utf8");
  const { before, after } = splitAtMarkers(shell, "<!-- readme:start -->", "<!-- readme:end -->", page.shell);
  const next = `${before}\n${render(markdown, page)}${after}`;
  if (next === shell) {
    console.log(`landing: ${page.shell} unchanged`);
  } else {
    writeFileSync(shellPath, next);
    console.log(`landing: wrote ${page.shell} from ${page.readme}`);
  }
}
