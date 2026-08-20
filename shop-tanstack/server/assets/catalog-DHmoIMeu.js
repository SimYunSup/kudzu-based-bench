//#region src/lib/site.ts
var BASE = "/kudzu-based-bench/shop-tanstack";
function assetUrl(path) {
	return `${BASE}/${path.replace(/^\//, "")}`;
}
function formatPrice(amount) {
	return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}
/** Cart lines are shared with the other variants through this key. */
var CART_KEY = "otw-cart";
var COLLECTIONS = [
	{
		handle: "outerwear",
		title: "아우터",
		description: "바람과 비를 막는 겉옷."
	},
	{
		handle: "knitwear",
		title: "니트",
		description: "겨울을 버티는 편물."
	},
	{
		handle: "shirts",
		title: "셔츠",
		description: "매일 입는 기본."
	},
	{
		handle: "denim",
		title: "데님",
		description: "오래 입을수록 좋아지는 것."
	},
	{
		handle: "footwear",
		title: "신발",
		description: "하루 종일 걷기 위한."
	},
	{
		handle: "accessories",
		title: "액세서리",
		description: "마지막 한 끗."
	}
];
var MATERIALS = [
	"코튼",
	"울",
	"리넨",
	"캐시미어",
	"나일론",
	"데님",
	"가죽",
	"리사이클 폴리"
];
var CUTS = [
	"오버사이즈",
	"레귤러",
	"크롭",
	"롱",
	"슬림",
	"와이드",
	"박시",
	"테이퍼드"
];
var NOUNS = [
	"재킷",
	"코트",
	"카디건",
	"스웨터",
	"셔츠",
	"팬츠",
	"스니커",
	"토트백"
];
var SIZES = [
	"XS",
	"S",
	"M",
	"L",
	"XL"
];
var COLORS = [
	"블랙",
	"아이보리",
	"네이비",
	"올리브"
];
var TAGS = [
	"신상",
	"베스트",
	"리스탁",
	"한정",
	"친환경"
];
/** mulberry32 — 32-bit, no dependencies, identical output on every runtime. */
function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 >>> 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
var pick = (next, list) => list[Math.floor(next() * list.length)];
function imageFor(index, position) {
	const slot = (index * 7 + position * 3) % 12;
	return {
		url: `/commerce/p-${String(slot).padStart(2, "0")}.png`,
		altText: `상품 이미지 ${position + 1}`,
		width: 800,
		height: 800
	};
}
function variantsFor(handle, basePrice, next) {
	const sizes = SIZES.slice(0, 3 + Math.floor(next() * 3));
	const colors = COLORS.slice(0, 2 + Math.floor(next() * 3));
	const variants = [];
	for (const color of colors) for (const size of sizes) {
		const bump = SIZES.indexOf(size) * 1e3;
		variants.push({
			id: `${handle}--${color}-${size}`,
			title: `${color} / ${size}`,
			availableForSale: (SIZES.indexOf(size) + COLORS.indexOf(color)) % 7 !== 0,
			selectedOptions: [{
				name: "색상",
				value: color
			}, {
				name: "사이즈",
				value: size
			}],
			price: {
				amount: basePrice + bump,
				currencyCode: "KRW"
			}
		});
	}
	return variants;
}
function productAt(index) {
	const next = rng(24301 + index * 2654435761);
	const collection = COLLECTIONS[index % COLLECTIONS.length];
	const material = pick(next, MATERIALS);
	const cut = pick(next, CUTS);
	const noun = pick(next, NOUNS);
	const handle = `p-${String(index).padStart(5, "0")}`;
	const title = `${material} ${cut} ${noun}`;
	const variants = variantsFor(handle, 19e3 + Math.floor(next() * 40) * 1e3, next);
	const prices = variants.map((variant) => variant.price.amount);
	const description = `${material} 소재의 ${cut} ${noun}. 매일 입기 좋은 무게감과 마감.`;
	return {
		id: `gid://otw/Product/${index}`,
		handle,
		title,
		description,
		descriptionHtml: `<p>${description}</p><ul><li>소재: ${material}</li><li>핏: ${cut}</li><li>제조: 대한민국</li></ul><p>실측은 사이즈마다 1~2cm 오차가 있을 수 있습니다.</p>`,
		featuredImage: imageFor(index, 0),
		images: [
			imageFor(index, 0),
			imageFor(index, 1),
			imageFor(index, 2)
		],
		options: [{
			name: "색상",
			values: [...new Set(variants.map((v) => v.selectedOptions[0].value))]
		}, {
			name: "사이즈",
			values: [...new Set(variants.map((v) => v.selectedOptions[1].value))]
		}],
		variants,
		priceRange: {
			minVariantPrice: {
				amount: Math.min(...prices),
				currencyCode: "KRW"
			},
			maxVariantPrice: {
				amount: Math.max(...prices),
				currencyCode: "KRW"
			}
		},
		tags: [pick(next, TAGS)],
		collection: collection.handle,
		availableForSale: variants.some((variant) => variant.availableForSale),
		updatedAt: new Date(Date.UTC(2026, 0, 1) + index * 864e5).toISOString()
	};
}
var PAGES = [{
	handle: "shipping",
	title: "배송 안내",
	bodyHtml: "<p>오후 2시 이전 결제 건은 당일 출고됩니다.</p><p>제주 및 도서산간은 3,000원이 추가됩니다.</p>"
}, {
	handle: "returns",
	title: "교환 · 반품",
	bodyHtml: "<p>수령일로부터 7일 이내 교환 및 반품이 가능합니다.</p><p>택 제거, 착용 흔적이 있는 경우 접수가 어렵습니다.</p>"
}];
var MENU = [
	{
		title: "전체",
		path: "/search"
	},
	...COLLECTIONS.map((collection) => ({
		title: collection.title,
		path: `/search/${collection.handle}`
	})),
	{
		title: "배송 안내",
		path: "/shipping"
	}
];
/**
* Build the catalog. Same `size` always yields the same bytes.
*
* Note the products are generated, not fetched: the fixture must build
* offline and identically on every machine, which a live storefront API
* cannot promise.
*/
function buildCatalog(size = 100) {
	const products = Array.from({ length: size }, (_, index) => productAt(index));
	return {
		products,
		collections: COLLECTIONS.map((collection) => ({
			...collection,
			productHandles: products.filter((product) => product.collection === collection.handle).map((product) => product.handle)
		})),
		menu: MENU,
		pages: PAGES
	};
}
/** Resolve the catalog size from the environment, defaulting to 100. */
function catalogSizeFromEnv(value) {
	const parsed = Number(value);
	return parsed === 1e3 || parsed === 1e4 ? parsed : 100;
}
//#endregion
//#region src/lib/catalog.ts
/**
* Build-time catalog. Vite compiles ordinary package imports, so unlike the
* Kudzu variant this needs no code generation step — the same difference the
* benchmark's build-cost track is measuring.
*/
var catalog = buildCatalog(catalogSizeFromEnv(process.env.OTW_CATALOG_SIZE));
function toTile(product) {
	return {
		handle: product.handle,
		title: product.title,
		href: `/product/${product.handle}`,
		imageUrl: assetUrl(product.featuredImage.url),
		imageAlt: product.featuredImage.altText,
		priceLabel: formatPrice(product.priceRange.minVariantPrice.amount),
		price: product.priceRange.minVariantPrice.amount,
		updated: Date.parse(product.updatedAt)
	};
}
/**
* Same flattened option contract as the Kudzu variant: size owns price and
* availability, colour owns the image. Kudzu cannot express a 2-D variant
* lookup, so neither variant does — otherwise the interaction being timed
* would not be the same interaction.
*/
function productOptions(product) {
	const firstColor = product.options[0].values[0];
	const sizes = product.variants.filter((variant) => variant.selectedOptions[0].value === firstColor).map((variant) => ({
		value: variant.selectedOptions[1].value,
		priceLabel: formatPrice(variant.price.amount),
		soldOut: !variant.availableForSale
	}));
	const colors = product.options[0].values.map((value, index) => ({
		value,
		imageUrl: assetUrl(product.images[index % product.images.length].url)
	}));
	return {
		sizes,
		colors,
		defaultSize: sizes.find((size) => !size.soldOut) ?? sizes[0],
		defaultColor: colors[0]
	};
}
//#endregion
export { CART_KEY as i, productOptions as n, toTile as r, catalog as t };
