// Static GitHub Pages deploy: the whole build is served from one artifact
// at https://simyunsup.github.io/kudzu-based-bench/, with this variant
// mounted under the /docs-vitepress/ sub-path (matches apps/vitepress's
// `base` and every other variant's own base config).
import { defineConfig } from "vitepress";
import { getDocs, resolveDocsSize } from "@otw/docs-data";

// Same corpus scripts/gen-docs.mjs writes to guide/<section>/<slug>.md —
// recomputed here (not read off disk) to build the sidebar/nav, since
// getDocs() is a pure, deterministic function of OTW_DOCS_SIZE and re-running
// it is cheaper and less fragile than re-deriving section/page metadata by
// re-parsing the generated Markdown's frontmatter.
const corpus = getDocs(resolveDocsSize(process.env.OTW_DOCS_SIZE));

const guideLink = (section: string, slug: string) => `/guide/${section}/${slug}`;

// One sidebar group per section, every page in the section listed (no
// pagination) — corpus.pages is already in "section order, then slug order"
// (see @otw/docs-data's DocsCorpus doc comment), i.e. filtering by section
// preserves indexInSection order within each group. VitePress flattens this
// exact structure to compute prev/next (see VPDocFooter.vue's usePrevNext),
// so the flattened order also matches corpus.pages' global `order` field —
// which is what the docs fixture's doc-prev/doc-next contract asks for.
const sidebarGroups = corpus.sections.map((section) => ({
  text: section.title,
  items: corpus.pages
    .filter((page) => page.section === section.handle)
    .map((page) => ({ text: page.title, link: guideLink(section.handle, page.slug) }))
}));

export default defineConfig({
  title: "Vine 문서",
  description: "가상 프레임워크 Vine의 문서 사이트.",
  lang: "ko",
  base: "/kudzu-based-bench/docs-vitepress/",

  // outDir left at the VitePress default (.vitepress/dist) — every other
  // variant's build output lives at a framework-default location too, and
  // the orchestrator's assemble step copies each app's own dist tree into
  // site/<key>/.

  // cleanUrls: every Markdown file VitePress compiles — generated or not —
  // always emits a flat `<param>.html` file, never `<param>/index.html`
  // (see README.md's VitePress fault #3 and scripts/gen-docs.mjs's header
  // comment). `cleanUrls: true` is the closest supported match to the other
  // variants' directory-form routes: it makes every internal <a> and the
  // client-side router use extension-less paths, and GitHub Pages serves
  // `/foo.html` at `/foo` without a redirect by default — so
  // `/guide/<section>/<slug>` resolves with no `.html` and no trailing
  // slash, functionally the same "pretty URL" contract just without the
  // trailing slash. scripts/lib/site-server.mjs's resolveStaticFile already
  // falls back from a bare path to `${path}.html`, so local dev/e2e serving
  // needs no changes either.
  cleanUrls: true,

  themeConfig: {
    nav: [{ text: "가이드", link: guideLink(corpus.pages[0]!.section, corpus.pages[0]!.slug) }],
    sidebar: {
      "/guide/": sidebarGroups
    },
    // Built-in local search (minisearch-backed, no external service) — the
    // default theme renders its button/panel inside VPNav's header
    // automatically once a provider is set; see `transformHtml` below for
    // how that header also picks up the docs fixture's doc-header class.
    search: {
      provider: "local"
    }
  },

  // Every heading VitePress' markdown-it renders keeps its own id (the
  // built-in anchor plugin registers its `heading_open` rule before this
  // `config(md)` hook runs, so wrapping — not replacing — that rule here is
  // what preserves it). This only *adds* class="doc-title" to h1 tokens;
  // every guide page's Markdown source (scripts/gen-docs.mjs) starts with
  // exactly one `# <title>` line, so there is exactly one h1 per page to tag.
  markdown: {
    config(md) {
      const renderHeadingOpen = md.renderer.rules.heading_open;
      md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        if (token.tag === "h1") token.attrSet("class", "doc-title");
        return renderHeadingOpen
          ? renderHeadingOpen(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options);
      };
    }
  },

  // Per-page HTML transform: the docs fixture's DOM contract asks for
  // specific classes/attributes the default theme's own components don't
  // render (confirmed by reading vitepress@1.6.4's theme-default source —
  // VPDoc.vue, VPDocFooter.vue, VPSidebarItem.vue, VPNav.vue). Each patch
  // below only *adds* a class/attribute to markup the default theme already
  // emits; nothing here changes an element's tag or removes anything, so a
  // failed match is a silent no-op rather than broken HTML.
  transformHtml(code, _id, ctx) {
    const base = ctx.siteConfig.site.base;
    let html = code;
    let changed = false;
    const patch = (pattern: RegExp, replacement: string) => {
      if (pattern.test(html)) {
        html = html.replace(pattern, replacement);
        changed = true;
      }
    };

    // doc-header: the search UI (VPNavBarSearch's #local-search) already
    // lives inside this <header>, so tagging it satisfies "헤더에 검색 UI"
    // without touching search itself.
    patch(/<header class="VPNav">/, '<header class="VPNav doc-header">');

    // doc-body: VPDoc.vue hard-codes `<Content class="vp-doc" .../>` inside
    // a plain <main> — never an <article>. Renaming the tag (not just
    // adding a class) would need balanced open/close-tag tracking this
    // string transform can't verify without a real build, so this stays a
    // <div> and only gains the class. It ends up nesting <h1
    // class="doc-title"> (tagged above) as its first child rather than
    // sitting beside it — <Content/> renders title and body as one lump,
    // there is no seam in the default theme to split them at.
    patch(/class="vp-doc(?=["\s])/, 'class="vp-doc doc-body');

    // sidebar: VPSidebar.vue's inner <nav id="VPSidebarNav"> is the closest
    // default-theme equivalent — kept as-is (with its "nav" class), and
    // additionally tagged so `.sidebar` resolves too.
    patch(/<nav class="nav" id="VPSidebarNav"/, '<nav class="nav sidebar" id="VPSidebarNav"');

    // doc-prev / doc-next: VPDocFooter.vue's auto-generated pager. It's
    // absent entirely (no markup at all) when there's no prev/next, which
    // is exactly the "없으면 생략" requirement — no extra work needed.
    patch(/class="pager-link prev"/, 'class="pager-link prev doc-prev"');
    patch(/class="pager-link next"/, 'class="pager-link next doc-next"');

    // aria-current="page": VPSidebarItem.vue only marks the active entry via
    // an `is-active` class on its *ancestor* <section>, never on the <a>
    // itself, and VPLink.vue's rendered `class` attribute on that <a> isn't
    // a fixed string (it merges VPLink's own root class with whatever the
    // parent passed down) — so this matches on `href` alone rather than
    // assuming an exact class value. This guide page's own sidebar
    // self-link is knowable exactly from its source path (ctx.page, e.g.
    // "guide/start/start-00.md"), and no other sidebar entry can share that
    // href, so the match is unique.
    const guideMatch = /^guide\/([^/]+)\/([^/]+)\.md$/.exec(ctx.page);
    if (guideMatch) {
      const [, section, slug] = guideMatch;
      const selfHref = `${base}guide/${section}/${slug}`;
      const escaped = selfHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      patch(
        new RegExp(`(<a\\b[^>]*\\shref="${escaped}")(?=[\\s>])`),
        '$1 aria-current="page"'
      );
    }

    return changed ? html : undefined;
  }
});
