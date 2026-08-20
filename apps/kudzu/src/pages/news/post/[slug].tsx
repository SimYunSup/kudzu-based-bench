// Post-body styles, scoped to .post-page/.markdown-body: this is the only
// route that renders them, and Kudzu 0.8.53+ links a stylesheet exactly where
// its source graph imports it. Astro's variant splits the same two sheets the
// same way.
import "../../../content.css";
import entries from "../../../generated/entries";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

interface PostPageProps {
  title: string;
  date: string | null;
  coverUrl: string | null;
  html: string;
}

export const metadata = {
  lang: "ko"
};

export async function getStaticPaths() {

  // Notion page ids are UUIDs (hyphens, no slash/query/hash characters), so
  // they satisfy Kudzu's single-safe-path-segment rule for route params
  // (framework/build.mjs routeFromPage rejects only "", ".", "..", and
  // \ / \0 ? # — hyphens are unaffected). No slug transform is needed.
  return entries.map(entry => ({
    params: { slug: entry.id },
    props: {
      title: entry.title,
      date: entry.date,
      coverUrl: entry.coverUrl,
      html: entry.html
    } satisfies PostPageProps
  }));
}

export default function NewsPostPage({ title, date, coverUrl, html }: PostPageProps) {
  const dateLabel = date ? new Intl.DateTimeFormat("ko-KR").format(new Date(date)) : null;

  return (
    <>
      <Header />
      <main className="post-page">
        {coverUrl && (
          <div className="image-container">
            <img src={coverUrl} alt="" />
          </div>
        )}
        <h1 className="title">{title}</h1>
        {dateLabel && (
          <div className="description">
            <p>{dateLabel}</p>
          </div>
        )}
        <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <Footer />
    </>
  );
}
