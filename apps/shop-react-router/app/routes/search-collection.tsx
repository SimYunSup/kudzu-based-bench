import { Link, useParams } from "react-router";
import { LISTING_LIMIT, catalog, toTile } from "../lib/catalog";

/**
 * Collection listing. Static by contract — filter and sort live on /search
 * only, because Kudzu cannot drive a selector pipeline from route props.
 * Every handle prerender() enumerates matches a real collection, so the
 * not-found branch below is unreachable in the static build; it only
 * guards a manual visit to an unknown handle in dev.
 */
export default function CollectionPage() {
  const { collection: handle } = useParams();
  const collection = catalog.collections.find(entry => entry.handle === handle);
  if (!collection) {
    return (
      <main className="search">
        <p>컬렉션을 찾을 수 없습니다.</p>
      </main>
    );
  }

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
