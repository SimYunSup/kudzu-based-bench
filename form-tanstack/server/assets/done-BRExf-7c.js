import { i as Route } from "./router-3w8jjvsI.js";
import { r as computeRefCode } from "./wizard-B5FQ8gTd.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/done.tsx?tsr-split=component
function DonePage() {
	const search = Route.useSearch();
	return /* @__PURE__ */ jsxs("main", {
		className: "wizard",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "done-title",
				children: "신청 완료"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "done-ref",
				children: computeRefCode(search)
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "done-summary",
				children: [
					"확인 메일을 ",
					/* @__PURE__ */ jsx("span", {
						className: "done-email",
						children: search.email ?? ""
					}),
					"로 보냈습니다."
				]
			}),
			/* @__PURE__ */ jsx("a", {
				className: "done-home",
				href: "../",
				children: "처음으로"
			})
		]
	});
}
//#endregion
export { DonePage as component };
