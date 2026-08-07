import entries from "../generated/entries";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PostCard, { type PostCardData } from "../components/PostCard";
import HeroLogo from "../components/HeroLogo";
import { siteUrl } from "../lib/site";

const RECENT_COUNT = 8;

// Precomputed at module scope: Kudzu treats function calls inside JSX
// expressions as reactive-binding captures and rejects imported helpers,
// so no siteUrl(...) call may appear inside the returned JSX.
const ARCHIVE_URL = siteUrl("news/list/1");
// Munja search is a vanilla ESM script (public/search.js, not compiled by
// Kudzu) — see kudzu.config.mjs afterBuild for how index.bin/munja/ land in
// dist/.
const SEARCH_SCRIPT_URL = siteUrl("search.js");

// Also precomputed at module scope: inside the component body Kudzu's
// collection analysis treats an array expression as a candidate reactive
// list, and this page has no state at all.
const RECENT_CARDS: PostCardData[] = entries.slice(0, RECENT_COUNT).map(entry => ({
  id: entry.id,
  title: entry.title,
  date: entry.date,
  coverUrl: entry.coverUrl,
  href: siteUrl(`news/post/${entry.id}`)
}));

export const metadata = {
  title: "Ones To Watch for FrontEnd",
  description: "매주 프론트엔드 소식을 정리해서 보내드립니다.",
  lang: "ko",
  icon: "/favicon.svg"
};

// Static build-time component: Kudzu runs the default export at build time
// and the page has no browser capability, so it emits zero JavaScript.
export default function HomePage() {
  return (
    <>
      <Header />
      <main className="home">
        <section className="hero">
          <div className="hero-text">
            <p className="mono-eyebrow hero-eyebrow">// weekly frontend newsletter</p>
            <h1 className="hero-title">
              Ones To Watch
              <br />
              for FrontEnd
            </h1>
            <p className="hero-sub">주목할 만한 블로그를 모아두는 웹사이트</p>
            <p className="hero-fineprint">주 1회 발행 · 광고 없음 · 언제든 해지</p>
          </div>
          <HeroLogo />
        </section>

        <section className="features">
          <div className="features-inner">
            <div className="feature">
              <p className="feature-num">01</p>
              <h3 className="feature-title">Deep Insights</h3>
              <p className="feature-desc">기술적인 깊이가 있거나 방향성을 고민하게 만드는 글</p>
            </div>
            <div className="feature">
              <p className="feature-num">02</p>
              <h3 className="feature-title">Curated Archive</h3>
              <p className="feature-desc">주 1회 발행되는 프론트엔드 아카이브</p>
            </div>
            <div className="feature">
              <p className="feature-num">03</p>
              <h3 className="feature-title">Developer Focused</h3>
              <p className="feature-desc">프론트엔드 개발자에게 영감을 주는 인사이트</p>
            </div>
          </div>
        </section>

        <section className="recent">
          <div className="recent-head">
            <h2 className="recent-title">최근 뉴스레터</h2>
            <a className="recent-all" href={ARCHIVE_URL}>
              전체 보기 →
            </a>
          </div>
          <div className="recent-search">
            <div className="munja-search" data-munja>
              <div className="munja-field">
                <svg
                  className="munja-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  className="munja-input"
                  type="search"
                  placeholder="뉴스레터 검색…"
                  aria-label="뉴스레터 검색"
                  autocomplete="off"
                  spellcheck="false"
                />
              </div>
              <ul className="munja-panel" role="listbox" aria-label="검색 결과" hidden></ul>
            </div>
          </div>
          <div className="post-list">
            {RECENT_CARDS.map(card => (
              <PostCard key={card.id} post={card} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <script type="module" src={SEARCH_SCRIPT_URL}></script>
    </>
  );
}
