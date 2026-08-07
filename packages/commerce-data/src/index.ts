/**
 * Deterministic commerce catalog generator.
 *
 * Every variant of the benchmark imports this and gets byte-identical data:
 * the generator is seeded, uses fixed word lists, and never reads the clock,
 * the network, or the filesystem. That is the whole point — the only thing
 * a cross-framework comparison may vary is the framework.
 *
 * Sizes are 100 / 1,000 / 10,000 products, chosen to sit on both sides of
 * the point where static-export build times start to diverge.
 */
import type {
  Catalog,
  CatalogSize,
  Collection,
  MenuItem,
  Product,
  ProductImage,
  ProductVariant,
  StaticPage
} from "./types.js";

export * from "./types.js";

/** Number of distinct product photos the whole catalog reuses. */
export const IMAGE_COUNT = 12;

export const COLLECTIONS: ReadonlyArray<{ handle: string; title: string; description: string }> = [
  { handle: "outerwear", title: "아우터", description: "바람과 비를 막는 겉옷." },
  { handle: "knitwear", title: "니트", description: "겨울을 버티는 편물." },
  { handle: "shirts", title: "셔츠", description: "매일 입는 기본." },
  { handle: "denim", title: "데님", description: "오래 입을수록 좋아지는 것." },
  { handle: "footwear", title: "신발", description: "하루 종일 걷기 위한." },
  { handle: "accessories", title: "액세서리", description: "마지막 한 끗." }
];

const MATERIALS = ["코튼", "울", "리넨", "캐시미어", "나일론", "데님", "가죽", "리사이클 폴리"];
const CUTS = ["오버사이즈", "레귤러", "크롭", "롱", "슬림", "와이드", "박시", "테이퍼드"];
const NOUNS = ["재킷", "코트", "카디건", "스웨터", "셔츠", "팬츠", "스니커", "토트백"];
const SIZES = ["XS", "S", "M", "L", "XL"];
const COLORS = ["블랙", "아이보리", "네이비", "올리브"];
const TAGS = ["신상", "베스트", "리스탁", "한정", "친환경"];

/** mulberry32 — 32-bit, no dependencies, identical output on every runtime. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(next: () => number, list: readonly T[]): T => list[Math.floor(next() * list.length)]!;

function imageFor(index: number, position: number): ProductImage {
  const slot = (index * 7 + position * 3) % IMAGE_COUNT;
  return {
    url: `/commerce/p-${String(slot).padStart(2, "0")}.png`,
    altText: `상품 이미지 ${position + 1}`,
    width: 800,
    height: 800
  };
}

function variantsFor(handle: string, basePrice: number, next: () => number): ProductVariant[] {
  const sizes = SIZES.slice(0, 3 + Math.floor(next() * 3));
  const colors = COLORS.slice(0, 2 + Math.floor(next() * 3));
  const variants: ProductVariant[] = [];

  for (const color of colors) {
    for (const size of sizes) {
      // Larger sizes cost a little more, so the variant selector actually
      // changes the rendered price instead of being decorative.
      const bump = SIZES.indexOf(size) * 1000;
      variants.push({
        id: `${handle}--${color}-${size}`,
        title: `${color} / ${size}`,
        // Deterministic ~15% out of stock so "unavailable option" states render.
        availableForSale: (SIZES.indexOf(size) + COLORS.indexOf(color)) % 7 !== 0,
        selectedOptions: [
          { name: "색상", value: color },
          { name: "사이즈", value: size }
        ],
        price: { amount: basePrice + bump, currencyCode: "KRW" }
      });
    }
  }

  return variants;
}

function productAt(index: number): Product {
  const next = rng(0x5eed + index * 2654435761);
  const collection = COLLECTIONS[index % COLLECTIONS.length]!;
  const material = pick(next, MATERIALS);
  const cut = pick(next, CUTS);
  const noun = pick(next, NOUNS);
  const handle = `p-${String(index).padStart(5, "0")}`;
  const title = `${material} ${cut} ${noun}`;
  const basePrice = 19000 + Math.floor(next() * 40) * 1000;
  const variants = variantsFor(handle, basePrice, next);
  const prices = variants.map(variant => variant.price.amount);
  const description = `${material} 소재의 ${cut} ${noun}. 매일 입기 좋은 무게감과 마감.`;

  return {
    id: `gid://otw/Product/${index}`,
    handle,
    title,
    description,
    descriptionHtml:
      `<p>${description}</p>` +
      `<ul><li>소재: ${material}</li><li>핏: ${cut}</li><li>제조: 대한민국</li></ul>` +
      `<p>실측은 사이즈마다 1~2cm 오차가 있을 수 있습니다.</p>`,
    featuredImage: imageFor(index, 0),
    images: [imageFor(index, 0), imageFor(index, 1), imageFor(index, 2)],
    options: [
      { name: "색상", values: [...new Set(variants.map(v => v.selectedOptions[0]!.value))] },
      { name: "사이즈", values: [...new Set(variants.map(v => v.selectedOptions[1]!.value))] }
    ],
    variants,
    priceRange: {
      minVariantPrice: { amount: Math.min(...prices), currencyCode: "KRW" },
      maxVariantPrice: { amount: Math.max(...prices), currencyCode: "KRW" }
    },
    tags: [pick(next, TAGS)],
    collection: collection.handle,
    availableForSale: variants.some(variant => variant.availableForSale),
    // Fixed epoch + index days: deterministic, and gives "latest" a real order.
    updatedAt: new Date(Date.UTC(2026, 0, 1) + index * 86_400_000).toISOString()
  };
}

const PAGES: StaticPage[] = [
  {
    handle: "shipping",
    title: "배송 안내",
    bodyHtml:
      "<p>오후 2시 이전 결제 건은 당일 출고됩니다.</p>" +
      "<p>제주 및 도서산간은 3,000원이 추가됩니다.</p>"
  },
  {
    handle: "returns",
    title: "교환 · 반품",
    bodyHtml:
      "<p>수령일로부터 7일 이내 교환 및 반품이 가능합니다.</p>" +
      "<p>택 제거, 착용 흔적이 있는 경우 접수가 어렵습니다.</p>"
  }
];

const MENU: MenuItem[] = [
  { title: "전체", path: "/search" },
  ...COLLECTIONS.map(collection => ({ title: collection.title, path: `/search/${collection.handle}` })),
  { title: "배송 안내", path: "/shipping" }
];

/**
 * Build the catalog. Same `size` always yields the same bytes.
 *
 * Note the products are generated, not fetched: the fixture must build
 * offline and identically on every machine, which a live storefront API
 * cannot promise.
 */
export function buildCatalog(size: CatalogSize = 100): Catalog {
  const products = Array.from({ length: size }, (_, index) => productAt(index));
  const collections: Collection[] = COLLECTIONS.map(collection => ({
    ...collection,
    productHandles: products
      .filter(product => product.collection === collection.handle)
      .map(product => product.handle)
  }));

  return { products, collections, menu: MENU, pages: PAGES };
}

/** Resolve the catalog size from the environment, defaulting to 100. */
export function catalogSizeFromEnv(value: string | undefined): CatalogSize {
  const parsed = Number(value);
  return parsed === 1000 || parsed === 10000 ? parsed : 100;
}
