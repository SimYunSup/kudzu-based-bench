"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_KEY, type CartLine } from "../lib/site";

interface HeaderProps {
  menu: { title: string; path: string }[];
}

/**
 * Storefront header with the cart drawer.
 *
 * The badge is read once on mount rather than kept live. Kudzu has no way for
 * one component to notify another (it rejects `new CustomEvent` in a handler),
 * so both variants implement the same mount-sync contract — otherwise the
 * measured interaction would differ between them.
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
      <Link className="logo" href="/">
        OTW Store
      </Link>
      <nav className="menu" aria-label="컬렉션">
        {menu.map(item => (
          <Link key={item.path} className="menu-link" href={item.path}>
            {item.title}
          </Link>
        ))}
      </nav>
      <button className="cart-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        장바구니 <span className="cart-count">{count}</span>
      </button>
      {open && (
        <div className="cart-drawer">
          <p className="cart-summary">담긴 상품 {count}개</p>
          <Link className="cart-link" href="/checkout">
            결제하기
          </Link>
          <button className="cart-close" onClick={() => setOpen(false)}>
            닫기
          </button>
        </div>
      )}
    </header>
  );
}
