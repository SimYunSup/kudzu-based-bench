import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output, project-page base path — same deploy contract as every
// other variant in this benchmark. Astro's default `build.format`
// ("directory") already yields `<path>/index.html`, so no extra config is
// needed to get the trailing-slash shape the harness expects.
export default defineConfig({
  base: "/ones-to-watch-refactor-test/shop-astro",
  output: "static",
  integrations: [react()],
});
