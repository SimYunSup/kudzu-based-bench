// Every static variant links to the other nine (see
// apps/kudzu/src/components/Footer.tsx for the pattern this is ported
// from). astro's entry point is /home, not /; every other variant serves
// its index at the bare subpath root.
export default [
  { key: "astro", label: "astro", href: "https://simyunsup.github.io/kudzu-based-bench/astro/home" },
  {
    key: "react-router",
    label: "react-router",
    href: "https://simyunsup.github.io/kudzu-based-bench/react-router/"
  },
  { key: "tanstack", label: "tanstack", href: "https://simyunsup.github.io/kudzu-based-bench/tanstack/" },
  { key: "kudzu", label: "kudzu", href: "https://simyunsup.github.io/kudzu-based-bench/kudzu/" },
  { key: "hugo", label: "hugo", href: "https://simyunsup.github.io/kudzu-based-bench/hugo/" },
  { key: "vitepress", label: "vitepress", href: "https://simyunsup.github.io/kudzu-based-bench/vitepress/" },
  {
    key: "docusaurus",
    label: "docusaurus",
    href: "https://simyunsup.github.io/kudzu-based-bench/docusaurus/"
  },
  { key: "eleventy", label: "eleventy", href: "https://simyunsup.github.io/kudzu-based-bench/eleventy/" },
  { key: "next-app", label: "next-app", href: "https://simyunsup.github.io/kudzu-based-bench/next-app/" },
  {
    key: "next-pages",
    label: "next-pages",
    href: "https://simyunsup.github.io/kudzu-based-bench/next-pages/"
  }
];
