import Link from "next/link";
import { notFound } from "next/navigation";
import { LISTING_LIMIT, catalog, toTile } from "../../../lib/catalog";

/**
 * Collection listing. Static by contract — filter and sort live on /search
 * only, because Kudzu cannot drive a selector pipeline from route props.
 */
export function generateStaticParams() {
  return catalog.collections.map(collection => ({ collection: collection.handle }));
}

export default async function CollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection: handle } = await params;
  const collection = catalog.collections.find(entry => entry.handle === handle);
  if (!collection) notFound();

  const rows = catalog.products
    .filter(product => product.collection === collection.handle)
    .slice(0, LISTING_LIMIT)
    .map(toTile);

  return (
    <main className="search">
      <header className="collection-header">
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </header>
      <div className="tile-grid">
        {rows.map(row => (
          <Link key={row.handle} className="tile" href={row.href}>
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
