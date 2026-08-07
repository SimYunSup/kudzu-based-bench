import { useEffect, useState } from "react";
import { CART_KEY, withBase, type CartLine } from "../lib/site";

interface HeaderProps {
  menu: { title: string; path: string }[];
}

/**
 * Storefront header with the cart drawer. Present on every route, so it is
 * the one island every page pays for — the honest cost of a header that
 * needs its own client state in a partial-hydration build.
 *
 * The badge is read once on mount rather than kept live. Kudzu has no way for
 * one component to notify another (it rejects `new CustomEvent` in a
 * handler), so every variant implements the same mount-sync contract —
 * otherwise the measured interaction would differ between them.
 */
export default function Header({ menu }: HeaderProps) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(CART_KEY);
    const lines: CartLine[] = raw ? JSON.parse(raw) : [];
    let total = 0;
    for (const line of lines) total = total + line.quantity;
    setCount(total);
  }, []);

  return (
    <header className="site-header">
      <a className="logo" href={withBase("/")}>
        OTW Store
      </a>
      <nav className="menu" aria-label="컬렉션">
        {menu.map(item => (
          <a key={item.path} className="menu-link" href={withBase(item.path)}>
            {item.title}
          </a>
        ))}
      </nav>
      <button className="cart-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        장바구니 <span className="cart-count">{count}</span>
      </button>
      {open && (
        <div className="cart-drawer">
          <p className="cart-summary">담긴 상품 {count}개</p>
          <a className="cart-link" href={withBase("/checkout")}>
            결제하기
          </a>
          <button className="cart-close" onClick={() => setOpen(false)}>
            닫기
          </button>
        </div>
      )}
    </header>
  );
}
