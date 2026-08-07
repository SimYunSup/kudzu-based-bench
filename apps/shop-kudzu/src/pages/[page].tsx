import Header from "../components/Header";
import Footer from "../components/Footer";
import { pages } from "../generated/catalog";

interface StaticPageProps {
  title: string;
  bodyHtml: string;
}

export const metadata = { lang: "ko" };

/**
 * Policy pages (`/shipping`, `/returns`). Outside the navigation group on
 * purpose: links here fall back to ordinary document navigation, which is one
 * of the cases the resilience track measures.
 */
export async function getStaticPaths() {
  const entries = [];
  for (const page of pages) {
    entries.push({
      params: { page: page.handle },
      props: { title: page.title, bodyHtml: page.bodyHtml } satisfies StaticPageProps
    });
  }
  return entries;
}

export default function PolicyPage({ title, bodyHtml }: StaticPageProps) {
  return (
    <>
      <Header />
      <main className="policy">
        <h1>{title}</h1>
        <article dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </main>
      <Footer />
    </>
  );
}
