// Vanilla ESM munja search client. Ported verbatim from
// apps/kudzu/public/search.js, with only the BASE constant's path updated —
// this is the same pattern react-router/tanstack/hugo/lume use for the
// island. Not an Eleventy template (no .njk/.html extension), so it's
// copied byte-for-byte to the output root via eleventy.config.js's
// passthrough copy and loaded via a plain <script type="module"> tag on
// the home and archive pages.
//
// Import specifiers resolve relative to *this module's own URL*, so this
// would work with a relative "./munja/munja.js" too — but fetch() below
// resolves relative to the *document's* URL, which differs per route depth
// (home vs. news/list/2/…). An absolute BASE keeps both consistent.
import init, { search_json } from "/kudzu-based-bench/eleventy/munja/munja.js";

const BASE = "/kudzu-based-bench/eleventy";

const escapeHtml = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build a ~80-char snippet centered on the first matched term, with every
// term wrapped in <mark> — this is what makes it obvious *why* a doc matched
// (e.g. an English word buried in Korean body text).
function snippet(body, terms) {
  const lower = body.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  const start = pos === -1 ? 0 : Math.max(0, pos - 30);
  const end = pos === -1 ? 90 : Math.min(body.length, pos + 50);
  let html = escapeHtml(body.slice(start, end));
  for (const t of terms) {
    if (t) html = html.replace(new RegExp(`(${escapeRe(t)})`, "gi"), "<mark>$1</mark>");
  }
  return (start > 0 ? "…" : "") + html + (end < body.length ? "…" : "");
}

document.querySelectorAll("[data-munja]").forEach((root) => {
  const input = root.querySelector(".munja-input");
  const panel = root.querySelector(".munja-panel");
  if (!input || !panel) return;

  let index = null;
  const ready = (async () => {
    await init(`${BASE}/munja/munja_bg.wasm`);
    const res = await fetch(`${BASE}/index.bin`);
    if (!res.ok) throw new Error(`index.bin ${res.status}`);
    index = new Uint8Array(await res.arrayBuffer());
  })().catch((e) => console.error("munja: failed to load index", e));

  const close = () => {
    panel.hidden = true;
    panel.innerHTML = "";
  };

  const run = async () => {
    await ready;
    const raw = input.value.trim();
    if (!index || raw === "") return close();
    const terms = raw.toLowerCase().split(/\s+/).filter(Boolean);
    let hits = [];
    try {
      hits = JSON.parse(search_json(index, raw, 8));
    } catch (e) {
      console.error("munja: search failed", e);
    }
    if (hits.length === 0) {
      panel.innerHTML = `<li class="munja-empty">검색 결과가 없어요</li>`;
      panel.hidden = false;
      return;
    }
    const qs = `?q=${encodeURIComponent(raw)}`;
    panel.innerHTML = hits
      .map(
        (h) => `<li role="option">
          <a href="${BASE}/${escapeHtml(h.href).replace(/^\//, "")}${qs}">
            <span class="munja-hit-head">
              <span class="munja-hit-title">${escapeHtml(h.title)}</span>
              <span class="munja-hit-cat">${escapeHtml(h.category)}</span>
            </span>
            <span class="munja-hit-snippet">${snippet(h.body, terms)}</span>
          </a>
        </li>`
      )
      .join("");
    panel.hidden = false;
  };

  input.addEventListener("input", run);
  input.addEventListener("focus", () => {
    if (input.value.trim() !== "") run();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      close();
    } else if (e.key === "Enter") {
      const first = panel.querySelector("a");
      if (first) {
        e.preventDefault();
        window.location.href = first.href;
      }
    }
  });
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) close();
  });
});
