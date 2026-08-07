import { siteUrl } from "../lib/site";

const LINKS = [
  { title: "배송 안내", href: siteUrl("/shipping") },
  { title: "교환 · 반품", href: siteUrl("/returns") }
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav aria-label="고객 안내">
        {LINKS.map(link => (
          <a key={link.href} href={link.href}>
            {link.title}
          </a>
        ))}
      </nav>
      <p>© 2026 OTW Store — 벤치마크 픽스처</p>
    </footer>
  );
}
