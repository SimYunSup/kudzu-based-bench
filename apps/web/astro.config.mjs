import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  site: 'https://simyunsup.github.io',
  base: '/kudzu-based-bench/astro',
  trailingSlash: 'ignore',
  integrations: [sitemap(), mdx(), partytown()],
  vite: { resolve: { alias: { '@': '/src' } } },
  // static output (default). GitHub Pages can't run SSR.
  // Redirect target is absolute and NOT base-prefixed by Astro, so include base.
  redirects: { '/': '/kudzu-based-bench/astro/home' },
});
