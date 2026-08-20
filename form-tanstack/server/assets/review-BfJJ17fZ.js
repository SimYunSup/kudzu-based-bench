import { r as Route } from "./router-3w8jjvsI.js";
import { a as formString, c as typeLabel, i as dietLabel, o as formStringArray, s as sessionLabel } from "./wizard-B5FQ8gTd.js";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/review.tsx?tsr-split=component
function Step3Page() {
	const carried = Route.useSearch();
	const navigate = useNavigate();
	function handleSubmit(event) {
		const data = new FormData(event.currentTarget);
		event.preventDefault();
		navigate({
			to: "/done",
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
	const dietDisplay = carried.diet.length > 0 ? carried.diet.map(dietLabel).join(", ") : "—";
	return /* @__PURE__ */ jsxs("main", {
		className: "wizard",
		children: [/* @__PURE__ */ jsxs("ol", {
			className: "wizard-progress",
			children: [
				/* @__PURE__ */ jsx("li", { children: "참가자 정보" }),
				/* @__PURE__ */ jsx("li", { children: "세션 선택" }),
				/* @__PURE__ */ jsx("li", {
					"aria-current": "step",
					children: "확인"
				})
			]
		}), /* @__PURE__ */ jsxs("form", {
			className: "wizard-step",
			"data-step": "3",
			method: "get",
			action: "../done/",
			onSubmit: handleSubmit,
			children: [
				/* @__PURE__ */ jsx("h1", { children: "확인" }),
				/* @__PURE__ */ jsxs("dl", {
					className: "summary",
					children: [
						/* @__PURE__ */ jsx("dt", { children: "이름" }),
						/* @__PURE__ */ jsx("dd", {
							className: "summary-name",
							children: carried.name ?? "—"
						}),
						/* @__PURE__ */ jsx("dt", { children: "이메일" }),
						/* @__PURE__ */ jsx("dd", {
							className: "summary-email",
							children: carried.email ?? "—"
						}),
						/* @__PURE__ */ jsx("dt", { children: "참가 유형" }),
						/* @__PURE__ */ jsx("dd", {
							className: "summary-type",
							children: typeLabel(carried.type)
						}),
						/* @__PURE__ */ jsx("dt", { children: "팀 이름" }),
						/* @__PURE__ */ jsx("dd", {
							className: "summary-team",
							children: carried.team ?? "—"
						}),
						/* @__PURE__ */ jsx("dt", { children: "세션" }),
						/* @__PURE__ */ jsx("dd", {
							className: "summary-session",
							children: sessionLabel(carried.session) ?? "—"
						}),
						/* @__PURE__ */ jsx("dt", { children: "식이 제한" }),
						/* @__PURE__ */ jsx("dd", {
							className: "summary-diet",
							children: dietDisplay
						}),
						/* @__PURE__ */ jsx("dt", { children: "쿠폰" }),
						/* @__PURE__ */ jsx("dd", {
							className: "summary-coupon",
							children: carried.coupon ?? "—"
						})
					]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "field confirm-row",
					children: /* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("input", {
						id: "confirm",
						name: "confirm",
						type: "checkbox",
						required: true
					}), " 위 내용이 맞습니다"] })
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
						}),
						/* @__PURE__ */ jsx("input", {
							type: "hidden",
							name: "session",
							value: carried.session ?? "",
							disabled: !carried.session
						}),
						carried.diet.map((value) => /* @__PURE__ */ jsx("input", {
							type: "hidden",
							name: "diet",
							value
						}, value)),
						/* @__PURE__ */ jsx("input", {
							type: "hidden",
							name: "coupon",
							value: carried.coupon ?? "",
							disabled: !carried.coupon
						})
					]
				}),
				/* @__PURE__ */ jsx("button", {
					className: "wizard-next",
					type: "submit",
					children: "신청하기"
				}),
				/* @__PURE__ */ jsx("a", {
					className: "wizard-back",
					href: "../session/",
					children: "이전"
				})
			]
		})]
	});
}
//#endregion
export { Step3Page as component };
