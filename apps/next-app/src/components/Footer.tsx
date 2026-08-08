// Every static variant links to the other nine so readers can hop between
// framework implementations of the same content.
const VARIANTS = [
  {
    key: "astro",
    label: "astro",
    href: "https://simyunsup.github.io/kudzu-based-bench/astro/home"
  },
  {
    key: "react-router",
    label: "react-router",
    href: "https://simyunsup.github.io/kudzu-based-bench/react-router/"
  },
  {
    key: "tanstack",
    label: "tanstack",
    href: "https://simyunsup.github.io/kudzu-based-bench/tanstack/"
  },
  {
    key: "kudzu",
    label: "kudzu",
    href: "https://simyunsup.github.io/kudzu-based-bench/kudzu/"
  },
  {
    key: "hugo",
    label: "hugo",
    href: "https://simyunsup.github.io/kudzu-based-bench/hugo/"
  },
  {
    key: "vitepress",
    label: "vitepress",
    href: "https://simyunsup.github.io/kudzu-based-bench/vitepress/"
  },
  {
    key: "docusaurus",
    label: "docusaurus",
    href: "https://simyunsup.github.io/kudzu-based-bench/docusaurus/"
  },
  {
    key: "eleventy",
    label: "eleventy",
    href: "https://simyunsup.github.io/kudzu-based-bench/eleventy/"
  },
  {
    key: "next-app",
    label: "next-app",
    href: "https://simyunsup.github.io/kudzu-based-bench/next-app/"
  },
  {
    key: "next-pages",
    label: "next-pages",
    href: "https://simyunsup.github.io/kudzu-based-bench/next-pages/"
  }
];

const CURRENT_VARIANT = "next-app";

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav className="variant-switch" aria-label="프레임워크 변형 전환">
        {VARIANTS.map(variant => (
          <a
            key={variant.key}
            href={variant.href}
            className={variant.key === CURRENT_VARIANT ? "variant-link is-active" : "variant-link"}
            aria-current={variant.key === CURRENT_VARIANT ? "page" : undefined}
          >
            {variant.label}
          </a>
        ))}
      </nav>
      <p>&copy; {new Date().getFullYear()} OTW for FE All rights reserved.</p>
    </footer>
  );
}
