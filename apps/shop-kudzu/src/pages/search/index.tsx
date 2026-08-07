import { useState } from "@kudzujs/core";
import Shell from "../../components/Shell";
import { searchTiles } from "../../generated/tiles";

export const metadata = {
  title: "전체 상품 — OTW Store",
  lang: "ko"
};

/**
 * Listing page: text filter plus sort over a keyed grid.
 *
 * The pipeline is inline on the imported literal array and the row is
 * intrinsic markup. Both are forced by the compiler:
 *
 * - A `const visible = ...` alias inside the component is validated as a
 *   scalar "reactive JSX local" and rejects `.filter()`.
 * - `useState(rows)` hands the component a signal object, so the build-time
 *   render fails with "items.filter is not a function".
 * - `<ProductTile tile={tile} />` as the row rejects the whole-object prop.
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest");

  return (
    <Shell>
      <main className="search">
      <div className="search-controls">
        <label htmlFor="q">검색</label>
        <input
          id="q"
          type="search"
          value={query}
          placeholder="상품명"
          onInput={event => setQuery(event.currentTarget.value)}
        />
        <label htmlFor="sort">정렬</label>
        <select id="sort" value={sort} onChange={event => setSort(event.currentTarget.value)}>
          <option value="latest">최신순</option>
          <option value="price">가격 낮은순</option>
        </select>
      </div>

      <div className="tile-grid">
        {searchTiles
          .filter(item => item.title.includes(query))
          .toSorted((a, b) => (sort === "price" ? a.price - b.price : b.updated - a.updated))
          .map(tile => (
            <a key={tile.handle} className="tile" href={tile.href}>
              <div className="tile-image">
                <img src={tile.imageUrl} alt={tile.imageAlt} width="800" height="800" loading="lazy" />
              </div>
              <h3 className="tile-title">{tile.title}</h3>
              <p className="tile-price">{tile.priceLabel}</p>
            </a>
          ))}
      </div>
      </main>
    </Shell>
  );
}
