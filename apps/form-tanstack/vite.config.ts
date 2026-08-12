import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Static deploy, same shape as the other variants in this benchmark: the
// whole build is served from one artifact, with this app mounted under its
// own sub-path. No server runtime ships — every route must be a real static
// HTML file at build time.
const BASE = "/kudzu-based-bench/form-tanstack/";
const ROUTER_BASEPATH = "/kudzu-based-bench/form-tanstack";

export default defineConfig({
  base: BASE,
  // The harness probes for a directory named `dist`/`out`/`build/client`
  // containing `index.html` at its root. Start's default multi-environment
  // build nests the static client output under `dist/client` (with the
  // Nitro-less server bundle at `dist/server`) — pin the client environment's
  // outDir back to the repo-wide `dist` convention every other variant uses.
  environments: {
    client: {
      build: {
        outDir: "dist",
      },
    },
  },
  plugins: [
    tanstackStart({
      router: {
        basepath: ROUTER_BASEPATH,
      },
      // Fully static prerender — no server runtime ships with the build.
      // The wizard has no dynamic route segments, so auto-discovery alone
      // covers every page; crawlLinks is a safety net for anything only
      // reachable via an in-page link. Directory-style output
      // (`/session/index.html`) is the plugin default (`autoSubfolderIndex`).
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
    }),
    viteReact(),
  ],
});
