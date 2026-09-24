import { i as CART_KEY } from "./catalog-DHmoIMeu.js";
import { r as Route } from "./router-B1XcuDJp.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/ProductDetail.tsx
function ProductDetail({ handle, title, descriptionHtml, imageAlt, colors, sizes, defaultColor, defaultSize }) {
	const [imageUrl, setImageUrl] = useState(defaultColor.imageUrl);
	const [color, setColor] = useState(defaultColor.value);
	const [size, setSize] = useState(defaultSize.value);
	const [priceLabel, setPriceLabel] = useState(defaultSize.priceLabel);
	const [added, setAdded] = useState(false);
	return /* @__PURE__ */ jsxs("main", {
		className: "product",
		children: [/* @__PURE__ */ jsx("div", {
			className: "product-gallery",
			children: /* @__PURE__ */ jsx("img", {
				src: imageUrl,
				alt: imageAlt,
				width: "800",
				height: "800"
			})
		}), /* @__PURE__ */ jsxs("div", {
			className: "product-detail",
			children: [
				/* @__PURE__ */ jsx("h1", { children: title }),
				/* @__PURE__ */ jsx("p", {
					className: "product-price",
					children: priceLabel
				}),
				/* @__PURE__ */ jsxs("fieldset", {
					className: "option-group",
					children: [/* @__PURE__ */ jsx("legend", { children: "색상" }), colors.map((option) => /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "option",
						"aria-pressed": color === option.value,
						onClick: () => {
							setColor(option.value);
							setImageUrl(option.imageUrl);
						},
						children: option.value
					}, option.value))]
				}),
				/* @__PURE__ */ jsxs("fieldset", {
					className: "option-group",
					children: [/* @__PURE__ */ jsx("legend", { children: "사이즈" }), sizes.map((option) => /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "option",
						"aria-pressed": size === option.value,
						disabled: option.soldOut,
						onClick: () => {
							setSize(option.value);
							setPriceLabel(option.priceLabel);
						},
						children: option.value
					}, option.value))]
				}),
				/* @__PURE__ */ jsx("button", {
					className: "add-to-cart",
					onClick: () => {
						const raw = localStorage.getItem(CART_KEY);
						const lines = raw ? JSON.parse(raw) : [];
						lines.push({
							handle,
							color,
							size,
							title,
							quantity: 1
						});
						localStorage.setItem(CART_KEY, JSON.stringify(lines));
						setAdded(true);
					},
					children: "장바구니에 담기"
				}),
				added && /* @__PURE__ */ jsx("p", {
					className: "add-confirm",
					children: "담았습니다"
				}),
				/* @__PURE__ */ jsx("article", {
					className: "product-description",
					dangerouslySetInnerHTML: { __html: descriptionHtml }
				})
			]
		})]
	});
}
//#endregion
//#region src/routes/product.$handle.tsx?tsr-split=component
function ProductPage() {
	const { product, options } = Route.useLoaderData();
	const { sizes, colors, defaultSize, defaultColor } = options;
	return /* @__PURE__ */ jsx(ProductDetail, {
		handle: product.handle,
		title: product.title,
		descriptionHtml: product.descriptionHtml,
		imageAlt: product.featuredImage.altText,
		colors,
		sizes,
		defaultColor,
		defaultSize
	});
}
//#endregion
export { ProductPage as component };
