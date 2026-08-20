import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/checkout.tsx?tsr-split=component
/**
* Terminal step of the measured journey. Next.js Commerce hands off to
* Shopify here; the fixture stops at a static confirmation so no variant
* needs a server.
*/
function CheckoutPage() {
	return /* @__PURE__ */ jsxs("main", {
		className: "checkout",
		children: [/* @__PURE__ */ jsx("h1", { children: "결제" }), /* @__PURE__ */ jsx("p", { children: "벤치마크 픽스처입니다. 실제 결제는 진행되지 않습니다." })]
	});
}
//#endregion
export { CheckoutPage as component };
