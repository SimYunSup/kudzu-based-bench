// Boots Pagefind's default UI against the #search container in Header.tsx.
//
// Kudzu's TSX compiler only accepts relative TS helpers reachable from a
// page (no vendored npm packages inside handlers), and static
// `<link rel="stylesheet">` tags fail to compile inside component JSX (they
// must go through Kudzu's own CSS import pipeline) — so this file is
// intentionally NOT compiled by Kudzu. It ships as-is under public/ (copied
// verbatim into dist/ by Kudzu's build) and is loaded via a plain
// `<script type="module">` tag from Shell.tsx, which appends the stylesheet
// link and the UI bundle script itself.
//
// Pagefind's default UI bundle (pagefind-ui.js/css, from @pagefind/default-ui)
// is written by the `pagefind --site dist` step chained after `kudzu build`
// in package.json — it does not exist while Kudzu itself is building, only
// once this script runs in the browser against the finished dist/ output.
const BASE = "/kudzu-based-bench/docs-kudzu";

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = `${BASE}/pagefind/pagefind-ui.css`;
document.head.appendChild(stylesheet);

const script = document.createElement("script");
script.src = `${BASE}/pagefind/pagefind-ui.js`;
script.onload = () => {
  // eslint-disable-next-line no-undef -- global exposed by pagefind-ui.js
  new PagefindUI({ element: "#search", showSubResults: true });
};
document.head.appendChild(script);
