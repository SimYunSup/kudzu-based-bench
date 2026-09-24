import { a as formString } from "./wizard-B5FQ8gTd.js";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/index.tsx?tsr-split=component
function Step1Page() {
	const navigate = useNavigate();
	const [hydrated, setHydrated] = useState(false);
	const [type, setType] = useState("individual");
	useEffect(() => setHydrated(true), []);
	const teamRowHidden = hydrated && type !== "team";
	function handleSubmit(event) {
		const data = new FormData(event.currentTarget);
		event.preventDefault();
		navigate({
			to: "/session",
			search: {
				name: formString(data, "name"),
				email: formString(data, "email"),
				type: data.get("type") === "team" ? "team" : "individual",
				team: formString(data, "team")
			}
		});
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "wizard",
		children: [/* @__PURE__ */ jsxs("ol", {
			className: "wizard-progress",
			children: [
				/* @__PURE__ */ jsx("li", {
					"aria-current": "step",
					children: "참가자 정보"
				}),
				/* @__PURE__ */ jsx("li", { children: "세션 선택" }),
				/* @__PURE__ */ jsx("li", { children: "확인" })
			]
		}), /* @__PURE__ */ jsxs("form", {
			className: "wizard-step",
			"data-step": "1",
			method: "get",
			action: "session/",
			onSubmit: handleSubmit,
			children: [
				/* @__PURE__ */ jsx("h1", { children: "참가자 정보" }),
				/* @__PURE__ */ jsxs("p", {
					className: "field",
					children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "name",
						children: "이름"
					}), /* @__PURE__ */ jsx("input", {
						id: "name",
						name: "name",
						type: "text",
						required: true,
						minLength: 2,
						autoComplete: "name"
					})]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "field",
					children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "email",
						children: "이메일"
					}), /* @__PURE__ */ jsx("input", {
						id: "email",
						name: "email",
						type: "email",
						required: true,
						autoComplete: "email"
					})]
				}),
				/* @__PURE__ */ jsxs("fieldset", {
					className: "field",
					children: [
						/* @__PURE__ */ jsx("legend", { children: "참가 유형" }),
						/* @__PURE__ */ jsxs("label", { children: [
							/* @__PURE__ */ jsx("input", {
								type: "radio",
								name: "type",
								value: "individual",
								checked: type === "individual",
								onChange: () => setType("individual")
							}),
							" ",
							"개인"
						] }),
						/* @__PURE__ */ jsxs("label", { children: [
							/* @__PURE__ */ jsx("input", {
								type: "radio",
								name: "type",
								value: "team",
								checked: type === "team",
								onChange: () => setType("team")
							}),
							" ",
							"팀"
						] })
					]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "field team-row",
					hidden: teamRowHidden,
					children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "team-name",
						children: "팀 이름"
					}), /* @__PURE__ */ jsx("input", {
						id: "team-name",
						name: "team",
						type: "text",
						disabled: teamRowHidden,
						required: hydrated && type === "team"
					})]
				}),
				/* @__PURE__ */ jsx("button", {
					className: "wizard-next",
					type: "submit",
					children: "다음"
				})
			]
		})]
	});
}
//#endregion
export { Step1Page as component };
