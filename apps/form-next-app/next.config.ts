import type { NextConfig } from "next";

// Same deploy contract as the other benchmark variants: a project page under
// /kudzu-based-bench/<variant>/, served by a directory-listing
// static host with no Node runtime. `output: "export"` + `trailingSlash`
// gives every route its own <path>/index.html, which is what the benchmark
// server and GitHub Pages both expect.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/kudzu-based-bench/form-next-app",
  trailingSlash: true
};

export default nextConfig;
