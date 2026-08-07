import { useState } from "react";
import { CART_KEY, type CartLine } from "../lib/site";
import type { ColorOption, SizeOption } from "../lib/catalog";

interface ProductDetailProps {
  handle: string;
  title: string;
  descriptionHtml: string;
  imageAlt: string;
  colors: ColorOption[];
  sizes: SizeOption[];
  defaultColor: ColorOption;
  defaultSize: SizeOption;
}

export default function ProductDetail({
  handle,
  title,
  descriptionHtml,
  imageAlt,
  colors,
  sizes,
  defaultColor,
  defaultSize,
}: ProductDetailProps) {
  const [imageUrl, setImageUrl] = useState(defaultColor.imageUrl);
  const [color, setColor] = useState(defaultColor.value);
  const [size, setSize] = useState(defaultSize.value);
  const [priceLabel, setPriceLabel] = useState(defaultSize.priceLabel);
  const [added, setAdded] = useState(false);

  return (
    <main className="product">
      <div className="product-gallery">
        <img src={imageUrl} alt={imageAlt} width="800" height="800" />
      </div>

      <div className="product-detail">
        <h1>{title}</h1>
        <p className="product-price">{priceLabel}</p>

        <fieldset className="option-group">
          <legend>색상</legend>
          {colors.map((option) => (
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
          {sizes.map((option) => (
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
            const raw = localStorage.getItem(CART_KEY);
            const lines: CartLine[] = raw ? JSON.parse(raw) : [];
            lines.push({ handle, color, size, title, quantity: 1 });
            localStorage.setItem(CART_KEY, JSON.stringify(lines));
            setAdded(true);
          }}
        >
          장바구니에 담기
        </button>
        {added && <p className="add-confirm">담았습니다</p>}

        <article className="product-description" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
      </div>
    </main>
  );
}
