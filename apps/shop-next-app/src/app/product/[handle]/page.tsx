import { notFound } from "next/navigation";
import ProductDetail from "../../../components/ProductDetail";
import { catalog, productOptions } from "../../../lib/catalog";

export function generateStaticParams() {
  return catalog.products.map(product => ({ handle: product.handle }));
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = catalog.products.find(entry => entry.handle === handle);
  if (!product) notFound();

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
