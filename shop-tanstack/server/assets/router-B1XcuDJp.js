import { i as CART_KEY, n as productOptions, r as toTile, t as catalog } from "./catalog-DHmoIMeu.js";
import { useEffect, useState } from "react";
import { HeadContent, Link, Scripts, createFileRoute, createRootRoute, createRouter, lazyRouteComponent, notFound } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region src/components/Header.tsx
/**
* Storefront header with the cart drawer.
*
* The badge is read once on mount rather than kept live. Kudzu has no way for
* one component to notify another (it rejects `new CustomEvent` in a handler),
* so both variants implement the same mount-sync contract — otherwise the
* measured interaction would differ between them.
*/
function Header({ menu }) {
	const [count, setCount] = useState(0);
	const [open, setOpen] = useState(false);
	useEffect(() => {
		const raw = localStorage.getItem(CART_KEY);
		const lines = raw ? JSON.parse(raw) : [];
		let total = 0;
		for (const line of lines) total = total + line.quantity;
		setCount(total);
	}, []);
	return /* @__PURE__ */ jsxs("header", {
		className: "site-header",
		children: [
			/* @__PURE__ */ jsx(Link, {
				className: "logo",
				to: "/",
				children: "OTW Store"
			}),
			/* @__PURE__ */ jsx("nav", {
				className: "menu",
				"aria-label": "컬렉션",
				children: menu.map((item) => /* @__PURE__ */ jsx(Link, {
					className: "menu-link",
					to: item.path,
					children: item.title
				}, item.path))
			}),
			/* @__PURE__ */ jsxs("button", {
				className: "cart-button",
				"aria-expanded": open,
				onClick: () => setOpen(!open),
				children: ["장바구니 ", /* @__PURE__ */ jsx("span", {
					className: "cart-count",
					children: count
				})]
			}),
			open && /* @__PURE__ */ jsxs("div", {
				className: "cart-drawer",
				children: [
					/* @__PURE__ */ jsxs("p", {
						className: "cart-summary",
						children: [
							"담긴 상품 ",
							count,
							"개"
						]
					}),
					/* @__PURE__ */ jsx(Link, {
						className: "cart-link",
						to: "/checkout",
						children: "결제하기"
					}),
					/* @__PURE__ */ jsx("button", {
						className: "cart-close",
						onClick: () => setOpen(false),
						children: "닫기"
					})
				]
			})
		]
	});
}
//#endregion
//#region src/components/Footer.tsx
var LINKS = [{
	title: "배송 안내",
	href: "/shipping"
}, {
	title: "교환 · 반품",
	href: "/returns"
}];
function Footer() {
	return /* @__PURE__ */ jsxs("footer", {
		className: "site-footer",
		children: [/* @__PURE__ */ jsx("nav", {
			"aria-label": "고객 안내",
			children: LINKS.map((link) => /* @__PURE__ */ jsx(Link, {
				to: link.href,
				children: link.title
			}, link.href))
		}), /* @__PURE__ */ jsx("p", { children: "© 2026 OTW Store — 벤치마크 픽스처" })]
	});
}
//#endregion
//#region src/routes/__root.tsx
var Route$6 = createRootRoute({
	head: () => ({ meta: [
		{ charSet: "utf-8" },
		{
			name: "viewport",
			content: "width=device-width, initial-scale=1"
		},
		{ title: "OTW Store — 커머스 벤치마크 픽스처" },
		{
			name: "description",
			content: "같은 상점을 프레임워크마다 정적으로 빌드해 비교하는 픽스처입니다."
		}
	] }),
	shellComponent: RootDocument
});
function RootDocument({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "ko",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [
			/* @__PURE__ */ jsx(Header, { menu: catalog.menu }),
			children,
			/* @__PURE__ */ jsx(Footer, {}),
			/* @__PURE__ */ jsx(Scripts, {})
		] })]
	});
}
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$5 = () => import("./routes-DCGDe0B2.js");
var Route$5 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
//#endregion
//#region src/routes/$page.tsx
var $$splitComponentImporter$4 = () => import("./_page-D3N9d9El.js");
/** Policy pages (`/shipping`, `/returns`). */
var Route$4 = createFileRoute("/$page")({
	loader: ({ params }) => {
		const page = catalog.pages.find((entry) => entry.handle === params.page);
		if (!page) throw notFound();
		return page;
	},
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
//#endregion
//#region src/routes/checkout.tsx
var $$splitComponentImporter$3 = () => import("./checkout-KelU2nb3.js");
/**
* Terminal step of the measured journey. Next.js Commerce hands off to
* Shopify here; the fixture stops at a static confirmation so no variant
* needs a server.
*/
var Route$3 = createFileRoute("/checkout")({
	head: () => ({ meta: [{ title: "결제 — OTW Store" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
//#endregion
//#region src/routes/search.tsx
var $$splitComponentImporter$2 = () => import("./search-CXsmeaZc.js");
var Route$2 = createFileRoute("/search")({
	head: () => ({ meta: [{ title: "전체 상품 — OTW Store" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
//#endregion
//#region src/routes/product.$handle.tsx
var $$splitComponentImporter$1 = () => import("./product._handle-CZ8Lns0i.js");
var Route$1 = createFileRoute("/product/$handle")({
	loader: ({ params }) => {
		const product = catalog.products.find((entry) => entry.handle === params.handle);
		if (!product) throw notFound();
		return {
			product,
			options: productOptions(product)
		};
	},
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
//#endregion
//#region src/routes/search.$collection.tsx
var $$splitComponentImporter = () => import("./search._collection-DLT6S-eK.js");
/**
* Collection listing. Static by contract — filter and sort live on /search
* only, because Kudzu cannot drive a selector pipeline from route params.
*/
var Route = createFileRoute("/search/$collection")({
	loader: ({ params }) => {
		const collection = catalog.collections.find((entry) => entry.handle === params.collection);
		if (!collection) throw notFound();
		return {
			collection,
			rows: catalog.products.filter((product) => product.collection === collection.handle).slice(0, 48).map(toTile)
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
//#region src/routeTree.gen.ts
var IndexRoute = Route$5.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$6
});
var PageRoute = Route$4.update({
	id: "/$page",
	path: "/$page",
	getParentRoute: () => Route$6
});
var CheckoutRoute = Route$3.update({
	id: "/checkout",
	path: "/checkout",
	getParentRoute: () => Route$6
});
var SearchRoute = Route$2.update({
	id: "/search",
	path: "/search",
	getParentRoute: () => Route$6
});
var ProductHandleRoute = Route$1.update({
	id: "/product/$handle",
	path: "/product/$handle",
	getParentRoute: () => Route$6
});
var SearchRouteChildren = { SearchCollectionRoute: Route.update({
	id: "/$collection",
	path: "/$collection",
	getParentRoute: () => SearchRoute
}) };
var rootRouteChildren = {
	IndexRoute,
	PageRoute,
	CheckoutRoute,
	SearchRoute: SearchRoute._addFileChildren(SearchRouteChildren),
	ProductHandleRoute
};
var routeTree = Route$6._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: "intent",
		scrollRestoration: true
	});
}
//#endregion
export { getRouter, Route$4 as i, Route as n, Route$1 as r, router_exports as t };
