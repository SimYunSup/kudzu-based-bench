import { useState } from "@kudzujs/core";
import Shell from "../../components/Shell";
import { products } from "../../generated/catalog";
import { formatPrice, siteUrl } from "../../lib/site";

interface SizeOption {
  value: string;
  price: number;
  priceLabel: string;
  soldOut: boolean;
}

interface ColorOption {
  value: string;
  imageUrl: string;
}

interface ProductPageProps {
  handle: string;
  title: string;
  descriptionHtml: string;
  imageAlt: string;
  defaultImageUrl: string;
  defaultColor: string;
  defaultSize: string;
  defaultPriceLabel: string;
  colors: ColorOption[];
  sizes: SizeOption[];
}

export const metadata = { lang: "ko" };

export async function getStaticPaths() {
  const entries = [];

  for (const product of products) {
    // The fixture flattens the option matrix into independent axes: size owns
    // price and availability, colour owns the image. Kudzu cannot express a
    // 2-D variant lookup — a reactive value must come from a literal in the
    // handler or a direct state read, not from indexing a variant table with
    // two state values. Every variant implements the same flattened contract.
    const sizes: SizeOption[] = [];
    for (const variant of product.variants) {
      const colorValue = variant.selectedOptions[0].value;
      const sizeValue = variant.selectedOptions[1].value;
      if (colorValue !== product.options[0].values[0]) continue;
      sizes.push({
        value: sizeValue,
        price: variant.price.amount,
        priceLabel: formatPrice(variant.price.amount),
        soldOut: !variant.availableForSale
      });
    }

    const colors: ColorOption[] = [];
    for (let index = 0; index < product.options[0].values.length; index++) {
      colors.push({
        value: product.options[0].values[index],
        imageUrl: siteUrl(product.images[index % product.images.length].url)
      });
    }

    // A sold-out size must never be the pre-selected one, or the page loads
    // with a disabled option marked aria-pressed.
    const defaultSize = sizes.find(option => !option.soldOut) ?? sizes[0];

    entries.push({
      params: { handle: product.handle },
      props: {
        handle: product.handle,
        title: product.title,
        descriptionHtml: product.descriptionHtml,
        imageAlt: product.featuredImage.altText,
        defaultImageUrl: siteUrl(product.featuredImage.url),
        defaultColor: colors[0].value,
        defaultSize: defaultSize.value,
        defaultPriceLabel: defaultSize.priceLabel,
        colors,
        sizes
      } satisfies ProductPageProps
    });
  }

  return entries;
}

export default function ProductPage({
  handle,
  title,
  descriptionHtml,
  imageAlt,
  defaultImageUrl,
  defaultColor,
  defaultSize,
  defaultPriceLabel,
  colors,
  sizes
}: ProductPageProps) {
  const [imageUrl, setImageUrl] = useState(defaultImageUrl);
  const [color, setColor] = useState(defaultColor);
  const [size, setSize] = useState(defaultSize);
  const [priceLabel, setPriceLabel] = useState(defaultPriceLabel);
  const [added, setAdded] = useState(false);

  return (
    <Shell>
      <main className="product">
      <div className="product-gallery">
        <img src={imageUrl} alt={imageAlt} width="800" height="800" />
      </div>

      <div className="product-detail">
        <h1>{title}</h1>
        <p className="product-price">{priceLabel}</p>

        <fieldset className="option-group">
          <legend>색상</legend>
          {colors.map(option => (
            <button
              key={option.value}
              type="button"
              className="option"
              aria-pressed={color === option.value}
              onClick={() => {
                setColor(option.value);
                setImageUrl(option.imageUrl);
              }}
            >
              {option.value}
            </button>
          ))}
        </fieldset>

        <fieldset className="option-group">
          <legend>사이즈</legend>
          {sizes.map(option => (
            <button
              key={option.value}
              type="button"
              className="option"
              aria-pressed={size === option.value}
              disabled={option.soldOut}
              onClick={() => {
                setSize(option.value);
                setPriceLabel(option.priceLabel);
              }}
            >
              {option.value}
            </button>
          ))}
        </fieldset>

        <button
          className="add-to-cart"
          onClick={() => {
            // No cross-component notification: Kudzu rejects `new CustomEvent`
            // in a handler ("Native capture "CustomEvent" is not serializable")
            // and offers no way for one component to push state into another.
            // The header badge therefore syncs on document load, and every
            // other variant implements the same contract so the comparison
            // stays behavior-matched.
            const raw = localStorage.getItem("otw-cart");
            const lines = raw ? JSON.parse(raw) : [];
            lines.push({ handle, color, size, title, quantity: 1 });
            localStorage.setItem("otw-cart", JSON.stringify(lines));
            setAdded(true);
          }}
        >
          장바구니에 담기
        </button>
        {added && <p className="add-confirm">담았습니다</p>}

        <article className="product-description" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
      </div>
      </main>
    </Shell>
  );
}
