import Shell from "../../../components/Shell";
import Sidebar, { type SidebarGroup } from "../../../components/Sidebar";
import { pages, sections } from "../../../generated/docs";
import { siteUrl } from "../../../lib/site";

interface GuidePageProps {
  title: string;
  bodyHtml: string;
  groups: SidebarGroup[];
  prevHref: string;
  prevTitle: string;
  nextHref: string;
  nextTitle: string;
}

export const metadata = { lang: "ko" };

/**
 * One sidebar row per corpus page, grouped by section, with `current`
 * pre-baked per route — see Sidebar.tsx for why the flag must already be a
 * plain field by the time it reaches JSX. Ordinary computation inside
 * getStaticPaths() is unrestricted (same as apps/shop-kudzu's
 * search/[collection].tsx building its `rows` prop), unlike computation
 * inside a component body.
 */
function buildSidebarGroups(currentSection: string, currentSlug: string): SidebarGroup[] {
  const groups: SidebarGroup[] = [];
  for (const section of sections) {
    const rows: SidebarGroup["rows"] = [];
    for (const page of pages) {
      if (page.section !== section.handle) continue;
      rows.push({
        href: siteUrl(`guide/${page.section}/${page.slug}/`),
        title: page.title,
        current: page.section === currentSection && page.slug === currentSlug
      });
    }
    groups.push({ handle: section.handle, title: section.title, rows });
  }
  return groups;
}

export async function getStaticPaths() {
  const entries = [];
  for (const page of pages) {
    let prevHref = "";
    let prevTitle = "";
    let nextHref = "";
    let nextTitle = "";
    if (page.order > 0) {
      const prev = pages[page.order - 1];
      prevHref = siteUrl(`guide/${prev.section}/${prev.slug}/`);
      prevTitle = prev.title;
    }
    if (page.order < pages.length - 1) {
      const next = pages[page.order + 1];
      nextHref = siteUrl(`guide/${next.section}/${next.slug}/`);
      nextTitle = next.title;
    }
    entries.push({
      params: { section: page.section, slug: page.slug },
      props: {
        title: page.title,
        bodyHtml: page.bodyHtml,
        groups: buildSidebarGroups(page.section, page.slug),
        prevHref,
        prevTitle,
        nextHref,
        nextTitle
      } satisfies GuidePageProps
    });
  }
  return entries;
}

export default function GuidePage({ title, bodyHtml, groups, prevHref, prevTitle, nextHref, nextTitle }: GuidePageProps) {
  return (
    <Shell>
      <main className="doc-page">
        <Sidebar groups={groups} />
        <div className="doc-content" data-pagefind-body>
          <h1 className="doc-title">{title}</h1>
          <article className="doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          <nav className="doc-pager">
            {prevHref && (
              <a className="doc-prev" href={prevHref}>
                ← {prevTitle}
              </a>
            )}
            {nextHref && (
              <a className="doc-next" href={nextHref}>
                {nextTitle} →
              </a>
            )}
          </nav>
        </div>
      </main>
    </Shell>
  );
}
