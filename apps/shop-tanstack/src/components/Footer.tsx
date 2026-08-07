import { Link } from "@tanstack/react-router";

const LINKS = [
  { title: "배송 안내", href: "/shipping" },
  { title: "교환 · 반품", href: "/returns" },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav aria-label="고객 안내">
        {LINKS.map((link) => (
          <Link key={link.href} to={link.href}>
            {link.title}
          </Link>
        ))}
      </nav>
      <p>© 2026 OTW Store — 벤치마크 픽스처</p>
    </footer>
  );
}
