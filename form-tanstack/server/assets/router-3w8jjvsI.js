import { HeadContent, Scripts, createFileRoute, createRootRoute, createRouter, lazyRouteComponent } from "@tanstack/react-router";
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
//#region src/routes/__root.tsx
var Route$4 = createRootRoute({
	head: () => ({ meta: [
		{ charSet: "utf-8" },
		{
			name: "viewport",
			content: "width=device-width, initial-scale=1"
		},
		{ title: "워크숍 신청 — Form Wizard 벤치마크 픽스처" },
		{
			name: "description",
			content: "같은 신청 위저드를 프레임워크마다 정적으로 빌드해 비교하는 픽스처입니다."
		}
	] }),
	shellComponent: RootDocument
});
function RootDocument({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "ko",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$3 = () => import("./routes-DKoA7tzU.js");
var Route$3 = createFileRoute("/")({
	head: () => ({ meta: [{ title: "참가자 정보 — 워크숍 신청" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
//#endregion
//#region src/routes/done.tsx
var $$splitComponentImporter$2 = () => import("./done-BRExf-7c.js");
var Route$2 = createFileRoute("/done")({
	head: () => ({ meta: [{ title: "신청 완료 — 워크숍 신청" }] }),
	validateSearch: (search) => ({
		name: typeof search.name === "string" ? search.name : void 0,
		email: typeof search.email === "string" ? search.email : void 0,
		type: search.type === "team" ? "team" : "individual",
		team: typeof search.team === "string" ? search.team : void 0,
		session: typeof search.session === "string" ? search.session : void 0,
		diet: Array.isArray(search.diet) ? search.diet.filter((value) => typeof value === "string") : typeof search.diet === "string" ? [search.diet] : [],
		coupon: typeof search.coupon === "string" ? search.coupon : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
//#endregion
//#region src/routes/review.tsx
var $$splitComponentImporter$1 = () => import("./review-BfJJ17fZ.js");
var Route$1 = createFileRoute("/review")({
	head: () => ({ meta: [{ title: "확인 — 워크숍 신청" }] }),
	validateSearch: (search) => ({
		name: typeof search.name === "string" ? search.name : void 0,
		email: typeof search.email === "string" ? search.email : void 0,
		type: search.type === "team" ? "team" : "individual",
		team: typeof search.team === "string" ? search.team : void 0,
		session: typeof search.session === "string" ? search.session : void 0,
		diet: Array.isArray(search.diet) ? search.diet.filter((value) => typeof value === "string") : typeof search.diet === "string" ? [search.diet] : [],
		coupon: typeof search.coupon === "string" ? search.coupon : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
//#endregion
//#region src/routes/session.tsx
var $$splitComponentImporter = () => import("./session-DmGwLIWf.js");
var Route = createFileRoute("/session")({
	head: () => ({ meta: [{ title: "세션 선택 — 워크숍 신청" }] }),
	validateSearch: (search) => ({
		name: typeof search.name === "string" ? search.name : void 0,
		email: typeof search.email === "string" ? search.email : void 0,
		type: search.type === "team" ? "team" : "individual",
		team: typeof search.team === "string" ? search.team : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
//#region src/routeTree.gen.ts
var rootRouteChildren = {
	IndexRoute: Route$3.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$4
	}),
	DoneRoute: Route$2.update({
		id: "/done",
		path: "/done",
		getParentRoute: () => Route$4
	}),
	ReviewRoute: Route$1.update({
		id: "/review",
		path: "/review",
		getParentRoute: () => Route$4
	}),
	SessionRoute: Route.update({
		id: "/session",
		path: "/session",
		getParentRoute: () => Route$4
	})
};
var routeTree = Route$4._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function parseWizardSearch(raw) {
	const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
	const result = {};
	for (const key of params.keys()) {
		if (key in result) continue;
		const values = params.getAll(key);
		result[key] = values.length > 1 ? values : values[0];
	}
	return result;
}
function stringifyWizardSearch(search) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(search)) {
		if (value === void 0) continue;
		for (const entry of Array.isArray(value) ? value : [value]) params.append(key, String(entry));
	}
	const encoded = params.toString();
	return encoded ? `?${encoded}` : "";
}
function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: "intent",
		scrollRestoration: true,
		parseSearch: parseWizardSearch,
		stringifySearch: stringifyWizardSearch
	});
}
//#endregion
export { getRouter, Route$2 as i, Route as n, Route$1 as r, router_exports as t };
