// Eleventy (11ty v3) build config for the "docs-eleventy" variant of the
// docs+search benchmark fixture (a fictional "Vine" framework manual). Mirrors
// apps/eleventy/eleventy.config.js's directory layout and pathPrefix
// convention; the content pipeline itself is independent — data comes from
// @otw/docs-data, never Notion (that's the newsletter sibling's pipeline).

export default function (eleventyConfig) {
  // Capture Eleventy's built-in markdown-it instance (already a transitive
  // dependency of @11ty/eleventy, used internally for .md templates) so the
  // "markdown" filter below can render DocPage#body -> HTML without adding a
  // redundant markdown-it devDependency of our own.
  let mdLib;
  eleventyConfig.amendLibrary("md", (lib) => {
    mdLib = lib;
    return lib;
  });
  eleventyConfig.addFilter("markdown", (body) => (mdLib ? mdLib.render(body) : body));

  // style.css has no extension 11ty treats as a template format, so it needs
  // an explicit passthrough copy (https://www.11ty.dev/docs/copy/) — same
  // reasoning as apps/eleventy/eleventy.config.js's static asset copies.
  // Relative to the project root but living under "src", so it lands at the
  // output root (`src/style.css` -> `_site/style.css`), matching every
  // hand-authored `site.base`-prefixed <link>/<a> URL in the templates.
  eleventyConfig.addPassthroughCopy("src/style.css");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },

    // Deployed under the shared GitHub Pages artifact's
    // /docs-eleventy/ subpath. As in apps/eleventy, pathPrefix alone
    // doesn't rewrite hand-authored <a href>/<link>/<script src> values
    // (https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory) — every
    // internal URL below is instead prefixed by hand via the `site.base`
    // global data constant (src/_data/site.js). pathPrefix is kept here for
    // correctness/tooling parity with the sibling app.
    pathPrefix: "/kudzu-based-bench/docs-eleventy/"
  };
}
