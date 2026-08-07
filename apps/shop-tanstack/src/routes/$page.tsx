import { createFileRoute, notFound } from "@tanstack/react-router";
import { catalog } from "../lib/catalog";

/** Policy pages (`/shipping`, `/returns`). */
export const Route = createFileRoute("/$page")({
  loader: ({ params }) => {
    const page = catalog.pages.find((entry) => entry.handle === params.page);
    if (!page) throw notFound();
    return page;
  },
  component: PolicyPage,
});

function PolicyPage() {
  const page = Route.useLoaderData();

  return (
    <main className="policy">
      <h1>{page.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    </main>
  );
}
