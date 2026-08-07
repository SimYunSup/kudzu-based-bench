import Shell from "../components/Shell";
import ProductTile, { type TileData } from "../components/ProductTile";
import { collections, products } from "../generated/catalog";
import { formatPrice, siteUrl } from "../lib/site";

export const metadata = {
  title: "OTW Store — 커머스 벤치마크 픽스처",
  description: "10개 프레임워크로 같은 상점을 정적 빌드해 비교하는 픽스처입니다.",
  lang: "ko"
};

// All derived data is precomputed at module scope: Kudzu treats calls inside
// JSX as reactive-binding captures, and this page has no browser state.
//
// These are `for` loops rather than `.map()` because Kudzu's collection
// analysis claims every `.map()` over an imported array as a keyed-list site
// and then rejects the callback for not returning JSX (build.mjs
// keyedListParts -> "Keyed list map callback must return one JSX element").
// Reshaping imported data before render has to avoid `.map`.
const FEATURED: TileData[] = [];
for (const product of products.slice(0, 9)) {
  FEATURED.push({
    handle: product.handle,
    title: product.title,
    href: siteUrl(`/product/${product.handle}`),
    imageUrl: siteUrl(product.featuredImage.url),
    imageAlt: product.featuredImage.altText,
    priceLabel: formatPrice(product.priceRange.minVariantPrice.amount),
    soldOut: !product.availableForSale
  });
}

const COLLECTION_LINKS: {
  handle: string;
  title: string;
  description: string;
  href: string;
  countLabel: string;
}[] = [];
for (const collection of collections) {
  COLLECTION_LINKS.push({
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    href: siteUrl(`/search/${collection.handle}`),
    countLabel: `${collection.productHandles.length}개`
  });
}

const SEARCH_HREF = siteUrl("/search");

export default function HomePage() {
  return (
    <Shell>
      <main className="home">
        <section className="hero">
          <h1>이번 시즌</h1>
          <p>같은 상점을 프레임워크마다 정적으로 빌드해 성능을 비교합니다.</p>
          <a className="hero-cta" href={SEARCH_HREF}>
            전체 상품 보기
          </a>
        </section>

        <section className="collections">
          <h2>컬렉션</h2>
          <div className="collection-list">
            {COLLECTION_LINKS.map(link => (
              <a key={link.handle} className="collection-card" href={link.href}>
                <h3>{link.title}</h3>
                <p>{link.description}</p>
                <span className="collection-count">{link.countLabel}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="featured">
          <h2>추천 상품</h2>
          <div className="tile-grid">
            {FEATURED.map(tile => (
              <ProductTile key={tile.handle} tile={tile} />
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}
