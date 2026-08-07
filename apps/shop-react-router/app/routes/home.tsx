import { Link } from "react-router";
import { catalog, toTile } from "../lib/catalog";

const FEATURED = catalog.products.slice(0, 9).map(toTile);
const COLLECTIONS = catalog.collections.map(collection => ({
  handle: collection.handle,
  title: collection.title,
  description: collection.description,
  href: `/search/${collection.handle}`,
  countLabel: `${collection.productHandles.length}개`
}));

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <h1>이번 시즌</h1>
        <p>같은 상점을 프레임워크마다 정적으로 빌드해 성능을 비교합니다.</p>
        <Link className="hero-cta" to="/search">
          전체 상품 보기
        </Link>
      </section>

      <section className="collections">
        <h2>컬렉션</h2>
        <div className="collection-list">
          {COLLECTIONS.map(link => (
            <Link key={link.handle} className="collection-card" to={link.href}>
              <h3>{link.title}</h3>
              <p>{link.description}</p>
              <span className="collection-count">{link.countLabel}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured">
        <h2>추천 상품</h2>
        <div className="tile-grid">
          {FEATURED.map(tile => (
            <Link key={tile.handle} className="tile" to={tile.href}>
              <div className="tile-image">
                <img src={tile.imageUrl} alt={tile.imageAlt} width="800" height="800" loading="lazy" />
              </div>
              <h3 className="tile-title">{tile.title}</h3>
              <p className="tile-price">{tile.priceLabel}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
