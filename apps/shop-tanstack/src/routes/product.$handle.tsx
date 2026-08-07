import { createFileRoute, notFound } from "@tanstack/react-router";
import ProductDetail from "../components/ProductDetail";
import { catalog, productOptions } from "../lib/catalog";

export const Route = createFileRoute("/product/$handle")({
  loader: ({ params }) => {
    const product = catalog.products.find((entry) => entry.handle === params.handle);
    if (!product) throw notFound();
    return { product, options: productOptions(product) };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, options } = Route.useLoaderData();
  const { sizes, colors, defaultSize, defaultColor } = options;

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
