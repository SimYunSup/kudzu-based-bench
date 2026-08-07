/** Grid tile shape shared by the home grid and the search results. */
export interface TileData {
  handle: string;
  title: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  priceLabel: string;
  soldOut: boolean;
}

export default function ProductTile({ tile }: { tile: TileData }) {
  return (
    <a className="tile" href={tile.href}>
      <div className="tile-image">
        <img src={tile.imageUrl} alt={tile.imageAlt} width="800" height="800" loading="lazy" />
      </div>
      <h3 className="tile-title">{tile.title}</h3>
      <p className="tile-price">{tile.priceLabel}</p>
      {tile.soldOut && <p className="tile-sold-out">품절</p>}
    </a>
  );
}
