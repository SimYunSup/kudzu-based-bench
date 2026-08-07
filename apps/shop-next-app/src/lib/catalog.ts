import { buildCatalog, catalogSizeFromEnv } from "@otw/commerce-data";
import { assetUrl, formatPrice } from "./site";

/**
 * Build-time catalog. Next compiles ordinary package imports, so unlike the
 * Kudzu variant this needs no code generation step — the same difference the
 * benchmark's build-cost track is measuring.
 */
export const catalog = buildCatalog(catalogSizeFromEnv(process.env.OTW_CATALOG_SIZE));

/** Listing page size, matching the Kudzu variant's grid. */
export const LISTING_LIMIT = 48;

export interface Tile {
  handle: string;
  title: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  priceLabel: string;
  price: number;
  updated: number;
}

export function toTile(product: (typeof catalog.products)[number]): Tile {
  return {
    handle: product.handle,
    title: product.title,
    href: `/product/${product.handle}`,
    imageUrl: assetUrl(product.featuredImage.url),
    imageAlt: product.featuredImage.altText,
    priceLabel: formatPrice(product.priceRange.minVariantPrice.amount),
    price: product.priceRange.minVariantPrice.amount,
    updated: Date.parse(product.updatedAt)
  };
}

export interface SizeOption {
  value: string;
  priceLabel: string;
  soldOut: boolean;
}

export interface ColorOption {
  value: string;
  imageUrl: string;
}

/**
 * Same flattened option contract as the Kudzu variant: size owns price and
 * availability, colour owns the image. Kudzu cannot express a 2-D variant
 * lookup, so neither variant does — otherwise the interaction being timed
 * would not be the same interaction.
 */
export function productOptions(product: (typeof catalog.products)[number]) {
  const firstColor = product.options[0].values[0];
  const sizes: SizeOption[] = product.variants
    .filter(variant => variant.selectedOptions[0].value === firstColor)
    .map(variant => ({
      value: variant.selectedOptions[1].value,
      priceLabel: formatPrice(variant.price.amount),
      soldOut: !variant.availableForSale
    }));

  const colors: ColorOption[] = product.options[0].values.map((value, index) => ({
    value,
    imageUrl: assetUrl(product.images[index % product.images.length].url)
  }));

  // A sold-out size must never be pre-selected.
  const defaultSize = sizes.find(size => !size.soldOut) ?? sizes[0];

  return { sizes, colors, defaultSize, defaultColor: colors[0] };
}
