/**
 * Catalog shape for the commerce benchmark fixture.
 *
 * Deliberately mirrors the subset of Shopify's Storefront types that
 * Next.js Commerce (vercel/commerce) actually renders — product handle,
 * option/variant matrix, price range, images, collections, menu — so a
 * variant can be ported from that template without inventing a data model.
 * Everything a live storefront needs but a static benchmark does not
 * (checkout, inventory reservation, customer accounts) is out of scope.
 */

export interface Money {
  /** Minor-unit-free integer amount. The fixture is KRW, which has no cents. */
  amount: number;
  currencyCode: "KRW";
}

export interface ProductImage {
  /** Root-relative and base-less; each app prefixes its own deploy base. */
  url: string;
  altText: string;
  width: number;
  height: number;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
}

export interface Product {
  id: string;
  /** URL segment. Safe single path segment: [a-z0-9-]. */
  handle: string;
  title: string;
  description: string;
  /** Trusted, generated at build time — safe for dangerouslySetInnerHTML. */
  descriptionHtml: string;
  featuredImage: ProductImage;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  tags: string[];
  /** Handle of the owning collection. One collection per product. */
  collection: string;
  availableForSale: boolean;
  /** ISO date. Drives the "latest" sort so ordering is deterministic. */
  updatedAt: string;
}

export interface Collection {
  handle: string;
  title: string;
  description: string;
  productHandles: string[];
}

export interface MenuItem {
  title: string;
  /** Root-relative and base-less. */
  path: string;
}

export interface StaticPage {
  handle: string;
  title: string;
  /** Trusted, generated at build time. */
  bodyHtml: string;
}

export interface Catalog {
  products: Product[];
  collections: Collection[];
  menu: MenuItem[];
  /** Zero-interaction routes — the "does this variant ship 0 JS?" probe. */
  pages: StaticPage[];
}

/** Catalog sizes the benchmark builds at. */
export type CatalogSize = 100 | 1000 | 10000;
