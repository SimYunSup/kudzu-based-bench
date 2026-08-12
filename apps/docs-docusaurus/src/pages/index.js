// Site root ("/"), served by the default `@docusaurus/plugin-content-pages`
// (preset-classic's default `src/pages` path, left unconfigured in
// docusaurus.config.js). Deliberately separate from the docs plugin's
// `/guide/...` routes — this is the DOM contract's `.site-title` +
// `.section-card` grid, not a doc page.
//
// `nav.json` is written by scripts/gen-docs.mjs (run before this file is
// bundled, per package.json's "build" script) from the same
// @otw/docs-data corpus the docs themselves come from, so the section
// list/order and each section's first-page link always match what
// actually got built.
import React from "react";
import Layout from "@theme/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";
import nav from "../generated/nav.json";

function SectionCard({ section }) {
  const href = useBaseUrl(`/guide/${section.handle}/${section.firstSlug}/`);
  return (
    <a className="section-card" href={href}>
      <h2>{section.title}</h2>
      <p>{section.description}</p>
    </a>
  );
}

export default function Home() {
  return (
    <Layout title="Vine 문서" description="가상 프레임워크 Vine의 공식 문서와 로컬 검색.">
      <main className="home">
        <h1 className="site-title">Vine 문서</h1>
        <div className="section-grid">
          {nav.map(section => (
            <SectionCard key={section.handle} section={section} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
