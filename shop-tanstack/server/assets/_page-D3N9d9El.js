import { i as Route } from "./router-B1XcuDJp.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/$page.tsx?tsr-split=component
/** Policy pages (`/shipping`, `/returns`). */
function PolicyPage() {
	const page = Route.useLoaderData();
	return /* @__PURE__ */ jsxs("main", {
		className: "policy",
		children: [/* @__PURE__ */ jsx("h1", { children: page.title }), /* @__PURE__ */ jsx("article", { dangerouslySetInnerHTML: { __html: page.bodyHtml } })]
	});
}
//#endregion
export { PolicyPage as component };
