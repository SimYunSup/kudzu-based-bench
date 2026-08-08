import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Static GitHub Pages deploy: the whole build is served from one artifact
// at https://simyunsup.github.io/kudzu-based-bench/, with this
// variant mounted under the /react-router/ sub-path.
export default defineConfig({
  base: "/kudzu-based-bench/react-router/",
  plugins: [reactRouter()],
});
