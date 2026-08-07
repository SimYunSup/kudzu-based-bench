import { notFound } from "next/navigation";
import { catalog } from "../../lib/catalog";

/** Policy pages (`/shipping`, `/returns`). */
export function generateStaticParams() {
  return catalog.pages.map(page => ({ page: page.handle }));
}

export default async function PolicyPage({ params }: { params: Promise<{ page: string }> }) {
  const { page: handle } = await params;
  const page = catalog.pages.find(entry => entry.handle === handle);
  if (!page) notFound();

  return (
    <main className="policy">
      <h1>{page.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    </main>
  );
}
