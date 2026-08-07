import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { LISTING_LIMIT, catalog, toTile } from "../lib/catalog";

/**
 * Collection listing. Static by contract — filter and sort live on /search
 * only, because Kudzu cannot drive a selector pipeline from route params.
 */
export const Route = createFileRoute("/search/$collection")({
  loader: ({ params }) => {
    const collection = catalog.collections.find((entry) => entry.handle === params.collection);
    if (!collection) throw notFound();

    const rows = catalog.products
      .filter((product) => product.collection === collection.handle)
      .slice(0, LISTING_LIMIT)
      .map(toTile);

    return { collection, rows };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const { collection, rows } = Route.useLoaderData();

  return (
    <main className="search">
      <header className="collection-header">
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </header>
      <div className="tile-grid">
        {rows.map((row) => (
          <Link key={row.handle} className="tile" to={row.href}>
            <div className="tile-image">
              <img src={row.imageUrl} alt={row.imageAlt} width="800" height="800" loading="lazy" />
            </div>
            <h3 className="tile-title">{row.title}</h3>
            <p className="tile-price">{row.priceLabel}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
