import SearchGrid from "../../components/SearchGrid";
import { LISTING_LIMIT, catalog, toTile } from "../../lib/catalog";

export const metadata = { title: "전체 상품 — OTW Store" };

const TILES = catalog.products.slice(0, LISTING_LIMIT).map(toTile);

export default function SearchPage() {
  return <SearchGrid tiles={TILES} />;
}
