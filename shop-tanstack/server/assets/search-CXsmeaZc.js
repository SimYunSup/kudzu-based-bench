import { r as toTile, t as catalog } from "./catalog-DHmoIMeu.js";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/SearchGrid.tsx
/**
* Listing grid with text filter and sort. Same contract as the Kudzu variant:
* substring match on the title, sort by price ascending or by newest.
*/
function SearchGrid({ tiles }) {
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState("latest");
	const visible = tiles.filter((tile) => tile.title.includes(query)).toSorted((left, right) => sort === "price" ? left.price - right.price : right.updated - left.updated);
	return /* @__PURE__ */ jsxs("main", {
		className: "search",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "search-controls",
			children: [
				/* @__PURE__ */ jsx("label", {
					htmlFor: "q",
					children: "검색"
				}),
				/* @__PURE__ */ jsx("input", {
					id: "q",
					type: "search",
					value: query,
					placeholder: "상품명",
					onInput: (event) => setQuery(event.currentTarget.value),
					onChange: (event) => setQuery(event.currentTarget.value)
				}),
				/* @__PURE__ */ jsx("label", {
					htmlFor: "sort",
					children: "정렬"
				}),
				/* @__PURE__ */ jsxs("select", {
					id: "sort",
					value: sort,
					onChange: (event) => setSort(event.currentTarget.value),
					children: [/* @__PURE__ */ jsx("option", {
						value: "latest",
						children: "최신순"
					}), /* @__PURE__ */ jsx("option", {
						value: "price",
						children: "가격 낮은순"
					})]
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "tile-grid",
			children: visible.map((tile) => /* @__PURE__ */ jsxs(Link, {
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
	});
}
//#endregion
//#region src/routes/search.tsx?tsr-split=component
var TILES = catalog.products.slice(0, 48).map(toTile);
var SplitComponent = () => /* @__PURE__ */ jsx(SearchGrid, { tiles: TILES });
//#endregion
export { SplitComponent as component };
