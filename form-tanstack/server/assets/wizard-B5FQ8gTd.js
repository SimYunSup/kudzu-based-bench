//#region src/lib/wizard.ts
var SESSIONS = [
	{
		value: "s-01",
		title: "시그널 아키텍처"
	},
	{
		value: "s-02",
		title: "빌드 파이프라인"
	},
	{
		value: "s-03",
		title: "하이드레이션 전략"
	},
	{
		value: "s-04",
		title: "라우팅 계약"
	},
	{
		value: "s-05",
		title: "캐시 무효화"
	},
	{
		value: "s-06",
		title: "배포 자동화"
	}
];
function sessionLabel(value) {
	if (!value) return void 0;
	const found = SESSIONS.find((session) => session.value === value);
	return found ? `${found.value} — ${found.title}` : void 0;
}
var DIET_OPTIONS = [
	{
		value: "vegan",
		label: "비건"
	},
	{
		value: "vegetarian",
		label: "채식"
	},
	{
		value: "glutenfree",
		label: "글루텐프리"
	}
];
function dietLabel(value) {
	return DIET_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
function typeLabel(type) {
	return type === "team" ? "팀" : "개인";
}
/** Read a non-empty string field out of a submitted <form>'s FormData. */
function formString(data, key) {
	const value = data.get(key);
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
/** Read all values of a repeatable field (e.g. `diet`) out of FormData. */
function formStringArray(data, key) {
	return data.getAll(key).filter((value) => typeof value === "string" && value.length > 0);
}
var REF_KEYS = [
	"name",
	"email",
	"type",
	"team",
	"session",
	"diet",
	"coupon"
];
/**
* Byte-identical across every variant: canonicalizes the carried fields the
* same way `new URLSearchParams(search).getAll(key)` would, then hashes with
* FNV-1a. Kept independent of the router's search codec on purpose so a
* parsing quirk here can never desync the ref code from the other variants.
*/
function computeRefCode(search) {
	const getAll = (key) => {
		if (key === "diet") return search.diet;
		const value = search[key];
		return value ? [value] : [];
	};
	const canonical = REF_KEYS.map((key) => `${key}=${getAll(key).join(",")}`).join("|");
	let hash = 2166136261;
	for (let index = 0; index < canonical.length; index += 1) {
		hash ^= canonical.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return `REF-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}
//#endregion
export { formString as a, typeLabel as c, dietLabel as i, SESSIONS as n, formStringArray as o, computeRefCode as r, sessionLabel as s, DIET_OPTIONS as t };
