import { useParams } from "react-router";
import { catalog } from "../lib/catalog";

/** Policy pages (`/shipping`, `/returns`). */
export default function PolicyPage() {
  const { page: handle } = useParams();
  const page = catalog.pages.find(entry => entry.handle === handle);
  if (!page) {
    return (
      <main className="policy">
        <p>페이지를 찾을 수 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="policy">
      <h1>{page.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    </main>
  );
}
