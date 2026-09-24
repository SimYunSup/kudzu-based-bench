import { r as toTile, t as catalog } from "./catalog-DHmoIMeu.js";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/index.tsx?tsr-split=component
var FEATURED = catalog.products.slice(0, 9).map(toTile);
var COLLECTIONS = catalog.collections.map((collection) => ({
	handle: collection.handle,
	title: collection.title,
	description: collection.description,
	href: `/search/${collection.handle}`,
	countLabel: `${collection.productHandles.length}개`
}));
function HomePage() {
	return /* @__PURE__ */ jsxs("main", {
		className: "home",
		children: [
			/* @__PURE__ */ jsxs("section", {
				className: "hero",
				children: [
					/* @__PURE__ */ jsx("h1", { children: "이번 시즌" }),
					/* @__PURE__ */ jsx("p", { children: "같은 상점을 프레임워크마다 정적으로 빌드해 성능을 비교합니다." }),
					/* @__PURE__ */ jsx(Link, {
						className: "hero-cta",
						to: "/search",
						children: "전체 상품 보기"
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "collections",
				children: [/* @__PURE__ */ jsx("h2", { children: "컬렉션" }), /* @__PURE__ */ jsx("div", {
					className: "collection-list",
					children: COLLECTIONS.map((link) => /* @__PURE__ */ jsxs(Link, {
						className: "collection-card",
						to: link.href,
						children: [
							/* @__PURE__ */ jsx("h3", { children: link.title }),
							/* @__PURE__ */ jsx("p", { children: link.description }),
							/* @__PURE__ */ jsx("span", {
								className: "collection-count",
								children: link.countLabel
							})
						]
					}, link.handle))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "featured",
				children: [/* @__PURE__ */ jsx("h2", { children: "추천 상품" }), /* @__PURE__ */ jsx("div", {
					className: "tile-grid",
					children: FEATURED.map((tile) => /* @__PURE__ */ jsxs(Link, {
						className: "tile",
						to: tile.href,
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "tile-image",
								children: /* @__PURE__ */ jsx("img", {
									src: tile.imageUrl,
									alt: tile.imageAlt,
									width: "800",
									height: "800",
									loading: "lazy"
								})
							}),
							/* @__PURE__ */ jsx("h3", {
								className: "tile-title",
								children: tile.title
							}),
							/* @__PURE__ */ jsx("p", {
								className: "tile-price",
								children: tile.priceLabel
							})
						]
					}, tile.handle))
				})]
			})
		]
	});
}
//#endregion
export { HomePage as component };
