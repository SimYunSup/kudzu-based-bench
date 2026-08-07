import { createFileRoute } from "@tanstack/react-router";
import SearchGrid from "../components/SearchGrid";
import { LISTING_LIMIT, catalog, toTile } from "../lib/catalog";

const TILES = catalog.products.slice(0, LISTING_LIMIT).map(toTile);

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "전체 상품 — OTW Store" }] }),
  component: () => <SearchGrid tiles={TILES} />,
});
