import Shell from "../../components/Shell";
import { collections, products } from "../../generated/catalog";
import { formatPrice, siteUrl } from "../../lib/site";

const LIMIT = 48;

interface Row {
  handle: string;
  title: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  priceLabel: string;
}

interface CollectionPageProps {
  title: string;
  description: string;
  rows: Row[];
}

export const metadata = { lang: "ko" };

/**
 * Collection listing. Static by contract: filter and sort live on /search
 * only, because a keyed selector pipeline needs a literal imported array as
 * its source and a `getStaticPaths()` prop is not an analyzable collection
 * source. Every variant implements the same split so the comparison holds.
 */
export async function getStaticPaths() {
  const entries = [];

  for (const collection of collections) {
    const rows: Row[] = [];
    for (const product of products) {
      if (product.collection !== collection.handle) continue;
      if (rows.length >= LIMIT) break;
      rows.push({
        handle: product.handle,
        title: product.title,
        href: siteUrl(`/product/${product.handle}`),
        imageUrl: siteUrl(product.featuredImage.url),
        imageAlt: product.featuredImage.altText,
        priceLabel: formatPrice(product.priceRange.minVariantPrice.amount)
      });
    }
    entries.push({
      params: { collection: collection.handle },
      props: {
        title: collection.title,
        description: collection.description,
        rows
      } satisfies CollectionPageProps
    });
  }

  return entries;
}

export default function CollectionPage({ title, description, rows }: CollectionPageProps) {
  return (
    <Shell>
      <main className="search">
      <header className="collection-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="tile-grid">
        {rows.map(row => (
          <a key={row.handle} className="tile" href={row.href}>
            <div className="tile-image">
              <img src={row.imageUrl} alt={row.imageAlt} width="800" height="800" loading="lazy" />
            </div>
            <h3 className="tile-title">{row.title}</h3>
            <p className="tile-price">{row.priceLabel}</p>
          </a>
        ))}
      </div>
      </main>
    </Shell>
  );
}
