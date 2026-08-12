// Ejected from @docusaurus/theme-classic's DocItem/Content (the standard,
// commonly-swizzled target for custom doc-title rendering — see
// https://docusaurus.io/docs/swizzling) rather than left at the default.
//
// Stock behavior: a single `<div class="theme-doc-markdown markdown">`
// containing an inline `<h1>` (from `metadata.title`) followed by the MDX
// body. The docs fixture's DOM contract instead wants a `.doc-title` <h1>
// and a separate `.doc-body` <article> wrapping the rendered markdown, so
// this file replaces the whole component rather than wrapping it (wrapping
// can only add an outer element — it cannot split the original's single
// title+body div into two).
//
// `useDoc()` is the public hook exported from
// `@docusaurus/plugin-content-docs/client` for exactly this kind of DocItem
// sub-component customization; `metadata.title` is the same stable field
// every other theme-classic component (breadcrumbs, paginator, sidebar)
// already relies on.
import React from "react";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import MDXContent from "@theme/MDXContent";

export default function DocItemContent({ children }) {
  const { metadata } = useDoc();
  return (
    <div className="theme-doc-markdown markdown">
      <h1 className="doc-title">{metadata.title}</h1>
      <article className="doc-body">
        <MDXContent>{children}</MDXContent>
      </article>
    </div>
  );
}
