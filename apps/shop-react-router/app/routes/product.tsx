import { useParams } from "react-router";
import ProductDetail from "../components/ProductDetail";
import { catalog, productOptions } from "../lib/catalog";

export default function ProductPage() {
  const { handle } = useParams();
  const product = catalog.products.find(entry => entry.handle === handle);
  if (!product) {
    return (
      <main className="product">
        <p>상품을 찾을 수 없습니다.</p>
      </main>
    );
  }

  const { sizes, colors, defaultSize, defaultColor } = productOptions(product);

  return (
    <ProductDetail
      handle={product.handle}
      title={product.title}
      descriptionHtml={product.descriptionHtml}
      imageAlt={product.featuredImage.altText}
      colors={colors}
      sizes={sizes}
      defaultColor={defaultColor}
      defaultSize={defaultSize}
    />
  );
}
