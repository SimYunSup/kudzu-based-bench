import Shell from "../components/Shell";
import { pages, sections } from "../generated/docs";
import { siteUrl } from "../lib/site";

interface SectionCard {
  handle: string;
  title: string;
  description: string;
  href: string;
}

// Precomputed at module scope with a plain for loop, not `.map()`/`.find()`
// chained off the imported `pages`/`sections` arrays directly — Kudzu's
// compiler claims `.map()` over an imported array as keyed-list
// construction even outside JSX (see
// apps/shop-kudzu/scripts/gen-catalog.mjs), so shaping happens here and
// only the resulting local `CARDS` array feeds the JSX list below.
//
// `corpus.pages` is built section-by-section (see @otw/docs-data getDocs),
// so the first page whose `section` matches is that section's first page.
const CARDS: SectionCard[] = [];
for (const section of sections) {
  let href = "";
  for (const page of pages) {
    if (page.section === section.handle) {
      href = siteUrl(`guide/${page.section}/${page.slug}/`);
      break;
    }
  }
  CARDS.push({ handle: section.handle, title: section.title, description: section.description, href });
}

export const metadata = {
  title: "Vine 문서",
  description: "가상 프레임워크 Vine의 문서 사이트.",
  lang: "ko"
};

// Static build-time component: Kudzu runs the default export at build time
// and the page has no reactive state, so it emits zero JavaScript beyond
// the Shell's search.js loader.
export default function HomePage() {
  return (
    <Shell>
      <main className="home">
        <h1 className="site-title">Vine 문서</h1>
        <div className="section-cards">
          {CARDS.map(card => (
            <a key={card.handle} className="section-card" href={card.href}>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </a>
          ))}
        </div>
      </main>
    </Shell>
  );
}
