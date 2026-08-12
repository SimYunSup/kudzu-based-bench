// Project-page deployment: this app is served from
// https://simyunsup.github.io/kudzu-based-bench/docs-docusaurus/ alongside
// the other doc-fixture variants (docs-kudzu, docs-astro, docs-eleventy,
// docs-vitepress) and the commerce/newsletter fixtures. `url` + `baseUrl`
// are the two fields Docusaurus requires for subpath hosting — see
// "Deployment > Configuration" (https://docusaurus.io/docs/deployment#configuration).
//
// Unlike apps/docusaurus (the newsletter variant), this app uses the
// standard `@docusaurus/preset-classic` docs + pages plugins instead of a
// custom content plugin. That sidesteps README.md defect #4 entirely: the
// bug is specifically that a *custom* plugin's `addRoute` must be
// baseUrl-prefixed by hand (the core content plugins, including the docs
// plugin used here, already do this internally via `normalizeUrl([baseUrl,
// path])`), so there is nothing to work around.
export default {
  title: "Vine 문서",
  tagline: "가상 프레임워크 Vine의 공식 문서와 로컬 검색.",
  url: "https://simyunsup.github.io",
  baseUrl: "/kudzu-based-bench/docs-docusaurus/",
  favicon: "/favicon.svg",

  onBrokenLinks: "throw",

  // Directory-style pretty URLs (`<route>/index.html`) to match every
  // sibling variant's URL contract — `/guide/<section>/<slug>/`, not
  // `/guide/<section>/<slug>.html`.
  trailingSlash: true,

  i18n: {
    defaultLocale: "ko",
    locales: ["ko"],
    localeConfigs: {
      ko: { htmlLang: "ko" }
    }
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        // scripts/gen-docs.mjs materializes @otw/docs-data into this
        // directory before `docusaurus build` runs (see package.json's
        // "build" script) — one `.md` per DocPage plus a `_category_.json`
        // per section. `slug` front matter on every generated page forces
        // the final URL (see gen-docs.mjs), and `sidebarPath` below just
        // walks the generated tree — no hand-written sidebar to keep in
        // sync.
        docs: {
          path: "docs",
          routeBasePath: "guide",
          sidebarPath: "./sidebars.js"
        },
        // No blog in this fixture — just docs (`/guide/...`) and a single
        // static home page (`/`, from src/pages/index.js via the default
        // pages plugin, left at its default `src/pages` path below).
        blog: false,
        theme: {
          customCss: "./src/css/custom.css"
        }
      })
    ]
  ],

  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      /** @type {import('@easyops-cn/docusaurus-search-local').PluginOptions} */
      ({
        // Long-term-cacheable index filename.
        hashed: true,
        // Must match the docs plugin's routeBasePath above, not the
        // package's own "/docs" default — see the option's own docs:
        // "for docs-only mode this needs to be the same as routeBasePath".
        // We aren't in docs-only mode (there's also the "/" home page from
        // the pages plugin) but the requirement is really "whatever
        // routeBasePath actually is", not mode-specific.
        docsRouteBasePath: "guide",
        indexBlog: false,
        // lunr-languages DOES ship lunr.ko.js, and this plugin loads any
        // requested language via require("lunr-languages/lunr.<lang>")
        // (dist/server/server/utils/generate.js). With plain "en" the
        // tokenizer keeps no Hangul tokens at all — a query for a term that
        // sits verbatim in page titles returned "No results" — so Korean
        // support here is required, not an enhancement.
        language: ["en", "ko"]
      })
    ]
  ],

  themeConfig: {
    navbar: {
      title: "Vine 문서",
      items: []
    }
  }
};
