import { useEffect, useState } from "@kudzujs/core";
import { menu } from "../generated/catalog";
import { siteUrl } from "../lib/site";

// Precomputed at module scope: Kudzu rejects function calls inside JSX, and
// `.map()` over an imported array is claimed by its keyed-list analysis even
// outside JSX, so data reshaping uses a loop.
const HOME_HREF = siteUrl("/");
const MENU_LINKS: { title: string; href: string }[] = [];
for (const item of menu) {
  MENU_LINKS.push({ title: item.title, href: siteUrl(item.path) });
}
const CHECKOUT_HREF = siteUrl("/checkout");

/**
 * Storefront header with the cart drawer, matching Next.js Commerce's navbar:
 * logo, collection menu, and a cart button showing the current line count.
 *
 * The cart itself lives in localStorage because every Kudzu route is a
 * complete standalone document — there is no client-side store surviving a
 * navigation. The count is read once on mount and updated by the add-to-cart
 * handler on the product page through the same storage key.
 */
export default function Header() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("otw-cart");
    const lines = raw ? JSON.parse(raw) : [];
    let total = 0;
    for (const line of lines) total = total + line.quantity;
    setCount(total);
  }, []);

  return (
    <header className="site-header">
      <a className="logo" href={HOME_HREF}>
        OTW Store
      </a>
      <nav className="menu" aria-label="컬렉션">
        {MENU_LINKS.map(link => (
          <a key={link.href} className="menu-link" href={link.href}>
            {link.title}
          </a>
        ))}
      </nav>
      <button
        className="cart-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        장바구니 <span className="cart-count">{count}</span>
      </button>
      {open && (
        <div className="cart-drawer">
          <p className="cart-summary">담긴 상품 {count}개</p>
          <a className="cart-link" href={CHECKOUT_HREF}>
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
