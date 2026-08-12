import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Same deploy contract as the other benchmark variants: a project page under
// /kudzu-based-bench/form-react-router/, served by a directory-
// listing static host with no Node runtime.
export default defineConfig({
  base: "/kudzu-based-bench/form-react-router/",
  plugins: [reactRouter()]
});
