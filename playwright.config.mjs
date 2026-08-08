// @ts-check
import { defineConfig, devices } from "@playwright/test";

// e2e user-flow coverage for the four framework variants served from a
// single assembled Pages artifact (see scripts/serve-site.mjs and
// scripts/lib/site-server.mjs, also shared by visual-diff.mjs/perf-bench.mjs).
// `webServer` assembles site/ from apps/*/dist (or reuses it if already
// built) and boots the same static server the deployed GitHub Pages site
// runs on, on a fixed port so baseURL below can stay constant.
export default defineConfig({
  testDir: "e2e",
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node ./scripts/serve-site.mjs --port 4173",
    url: "http://127.0.0.1:4173/kudzu-based-bench/astro/home",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
