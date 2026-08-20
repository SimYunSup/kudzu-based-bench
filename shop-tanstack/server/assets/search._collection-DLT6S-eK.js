import { n as Route } from "./router-B1XcuDJp.js";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/search.$collection.tsx?tsr-split=component
/**
* Collection listing. Static by contract — filter and sort live on /search
* only, because Kudzu cannot drive a selector pipeline from route params.
*/
function CollectionPage() {
	const { collection, rows } = Route.useLoaderData();
	return /* @__PURE__ */ jsxs("main", {
		className: "search",
		children: [/* @__PURE__ */ jsxs("header", {
			className: "collection-header",
			children: [/* @__PURE__ */ jsx("h1", { children: collection.title }), /* @__PURE__ */ jsx("p", { children: collection.description })]
		}), /* @__PURE__ */ jsx("div", {
			className: "tile-grid",
			children: rows.map((row) => /* @__PURE__ */ jsxs(Link, {
				className: "tile",
				to: row.href,
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "tile-image",
						children: /* @__PURE__ */ jsx("img", {
							src: row.imageUrl,
							alt: row.imageAlt,
							width: "800",
							height: "800",
							loading: "lazy"
						})
					}),
					/* @__PURE__ */ jsx("h3", {
						className: "tile-title",
						children: row.title
					}),
					/* @__PURE__ */ jsx("p", {
						className: "tile-price",
						children: row.priceLabel
					})
				]
			}, row.handle))
		})]
	});
}
//#endregion
export { CollectionPage as component };
