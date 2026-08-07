import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { Tile } from "../lib/catalog";

/**
 * Listing grid with text filter and sort. Same contract as the Kudzu variant:
 * substring match on the title, sort by price ascending or by newest.
 */
export default function SearchGrid({ tiles }: { tiles: Tile[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest");

  const visible = tiles
    .filter((tile) => tile.title.includes(query))
    .toSorted((left, right) => (sort === "price" ? left.price - right.price : right.updated - left.updated));

  return (
    <main className="search">
      <div className="search-controls">
        <label htmlFor="q">검색</label>
        <input
          id="q"
          type="search"
          value={query}
          placeholder="상품명"
          onInput={(event) => setQuery(event.currentTarget.value)}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <label htmlFor="sort">정렬</label>
        <select id="sort" value={sort} onChange={(event) => setSort(event.currentTarget.value)}>
          <option value="latest">최신순</option>
          <option value="price">가격 낮은순</option>
        </select>
      </div>

      <div className="tile-grid">
        {visible.map((tile) => (
          <Link key={tile.handle} className="tile" to={tile.href}>
            <div className="tile-image">
              <img src={tile.imageUrl} alt={tile.imageAlt} width="800" height="800" loading="lazy" />
            </div>
            <h3 className="tile-title">{tile.title}</h3>
            <p className="tile-price">{tile.priceLabel}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
