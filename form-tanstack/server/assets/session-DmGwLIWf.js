import { n as Route } from "./router-3w8jjvsI.js";
import { a as formString, n as SESSIONS, o as formStringArray, t as DIET_OPTIONS } from "./wizard-B5FQ8gTd.js";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/session.tsx?tsr-split=component
function Step2Page() {
	const carried = Route.useSearch();
	const navigate = useNavigate();
	function handleSubmit(event) {
		const data = new FormData(event.currentTarget);
		event.preventDefault();
		navigate({
			to: "/review",
			search: {
				name: formString(data, "name"),
				email: formString(data, "email"),
				type: data.get("type") === "team" ? "team" : "individual",
				team: formString(data, "team"),
				session: formString(data, "session"),
				diet: formStringArray(data, "diet"),
				coupon: formString(data, "coupon")
			}
		});
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "wizard",
		children: [/* @__PURE__ */ jsxs("ol", {
			className: "wizard-progress",
			children: [
				/* @__PURE__ */ jsx("li", { children: "참가자 정보" }),
				/* @__PURE__ */ jsx("li", {
					"aria-current": "step",
					children: "세션 선택"
				}),
				/* @__PURE__ */ jsx("li", { children: "확인" })
			]
		}), /* @__PURE__ */ jsxs("form", {
			className: "wizard-step",
			"data-step": "2",
			method: "get",
			action: "../review/",
			onSubmit: handleSubmit,
			children: [
				/* @__PURE__ */ jsx("h1", { children: "세션 선택" }),
				/* @__PURE__ */ jsxs("p", {
					className: "field",
					children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "session",
						children: "세션"
					}), /* @__PURE__ */ jsxs("select", {
						id: "session",
						name: "session",
						required: true,
						defaultValue: "",
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "세션을 선택하세요"
						}), SESSIONS.map((session) => /* @__PURE__ */ jsxs("option", {
							value: session.value,
							children: [
								session.value,
								" — ",
								session.title
							]
						}, session.value))]
					})]
				}),
				/* @__PURE__ */ jsxs("fieldset", {
					className: "field",
					children: [/* @__PURE__ */ jsx("legend", { children: "식이 제한" }), DIET_OPTIONS.map((option) => /* @__PURE__ */ jsxs("label", { children: [
						/* @__PURE__ */ jsx("input", {
							type: "checkbox",
							name: "diet",
							value: option.value
						}),
						" ",
						option.label
					] }, option.value))]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "field",
					children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "coupon",
						children: "쿠폰 코드"
					}), /* @__PURE__ */ jsx("input", {
						id: "coupon",
						name: "coupon",
						type: "text",
						pattern: "[A-Z]{4}-[0-9]{4}",
						placeholder: "ABCD-1234"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "carried",
					hidden: true,
					children: [
						/* @__PURE__ */ jsx("input", {
							type: "hidden",
							name: "name",
							value: carried.name ?? "",
							disabled: !carried.name
						}),
						/* @__PURE__ */ jsx("input", {
							type: "hidden",
							name: "email",
							value: carried.email ?? "",
							disabled: !carried.email
						}),
						/* @__PURE__ */ jsx("input", {
							type: "hidden",
							name: "type",
							value: carried.type ?? "individual"
						}),
						/* @__PURE__ */ jsx("input", {
							type: "hidden",
							name: "team",
							value: carried.team ?? "",
							disabled: !carried.team
						})
					]
				}),
				/* @__PURE__ */ jsx("button", {
					className: "wizard-next",
					type: "submit",
					children: "다음"
				}),
				/* @__PURE__ */ jsx("a", {
					className: "wizard-back",
					href: "../",
					children: "이전"
				})
			]
		})]
	});
}
//#endregion
export { Step2Page as component };
