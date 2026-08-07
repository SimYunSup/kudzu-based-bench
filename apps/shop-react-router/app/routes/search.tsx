import SearchGrid from "../components/SearchGrid";
import { LISTING_LIMIT, catalog, toTile } from "../lib/catalog";

const TILES = catalog.products.slice(0, LISTING_LIMIT).map(toTile);

export default function SearchPage() {
  return <SearchGrid tiles={TILES} />;
}
