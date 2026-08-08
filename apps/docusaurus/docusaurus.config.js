// Project-page deployment: this app is served from
// https://simyunsup.github.io/kudzu-based-bench/docusaurus/
// alongside the other framework variants (see apps/kudzu/kudzu.config.mjs
// for the identical convention). `url` + `baseUrl` are the two fields
// Docusaurus requires for subpath hosting — see "Deployment > Configuration"
// (https://docusaurus.io/docs/deployment#configuration).
export default {
  title: "Ones To Watch for FrontEnd",
  tagline: "매주 프론트엔드 소식을 정리해서 보내드립니다.",
  url: "https://simyunsup.github.io",
  baseUrl: "/kudzu-based-bench/docusaurus/",
  favicon: "/favicon.svg",

  // Fail the build on any broken link registered through `@docusaurus/Link`
  // or `@docusaurus/useBrokenLinks` (docusaurus-config#onBrokenLinks —
  // default is already "throw", set explicitly per the assignment). This
  // app never imports `<Link>` — like the kudzu reference, every internal
  // href below is a plain `<a>` built from `useBaseUrl()`, and the footer's
  // cross-app variant switcher points at sibling deployments outside this
  // site's own route table — so the checker has nothing to flag, but
  // leaving it at "throw" costs nothing and guards future `<Link>` usage.
  onBrokenLinks: "throw",

  // Directory-style pretty URLs (`<route>/index.html`) to match every
  // sibling variant's URL contract. (Note: this does NOT fix the client
  // hydration bug — that was routes registered without the baseUrl prefix;
  // see plugins/newsletter.js. trailingSlash is purely about URL shape.)
  trailingSlash: true,

  // No docs/blog/pages/sitemap/search-algolia plugins and no
  // @docusaurus/preset-classic: this variant's whole identity is a single
  // custom content plugin (./plugins/newsletter.js) driving the Notion
  // newsletter data, so the built-in doc/blog/search/sitemap features would
  // be dead weight and are simply never registered below.
  plugins: ["./plugins/newsletter.js"],

  // No theme package either (classic theme's navbar/CSS would leak into the
  // kudzu-ported look). `@theme/Layout` and `@theme/NotFound` are swizzled
  // directly at src/theme/ instead — see src/theme/Layout/index.tsx.
  themes: [],

  // CSS ported verbatim from apps/kudzu/src/{style,content}.css (class
  // names preserved for the shared visual-diff/e2e suite). `clientModules`
  // are bundled into every page before the first React render — see
  // "Client architecture > Client modules"
  // (https://docusaurus.io/docs/advanced/client#client-modules). Docusaurus
  // core's webpack base config (not the classic theme) already wires up
  // css-loader/MiniCssExtractPlugin for any `.css` client module.
  clientModules: ["./src/style.css", "./src/content.css"],

  // Single Korean-only site — no locale switcher/translation infra to
  // configure. `htmlLang` here is what `@theme/SiteMetadataDefaults` (a
  // core client component, not theme-provided — always rendered) uses to
  // emit `<html lang="ko">` on every page automatically.
  i18n: {
    defaultLocale: "ko",
    locales: ["ko"],
    localeConfigs: {
      ko: { htmlLang: "ko" }
    }
  }
};
