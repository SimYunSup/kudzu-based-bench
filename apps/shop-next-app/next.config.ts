import type { NextConfig } from "next";

// Same deploy contract as the other benchmark variants: a project page under
// /ones-to-watch-refactor-test/<variant>/, served by a directory-listing
// static host with no Node runtime. `output: "export"` + `trailingSlash`
// gives every route its own <path>/index.html, which is what the benchmark
// server and GitHub Pages both expect.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ones-to-watch-refactor-test/shop-next-app",
  trailingSlash: true,
  // Static export has no image-optimization server. The catalog images are
  // pre-generated and byte-identical across variants anyway, so optimization
  // would only introduce a difference the benchmark is trying to hold fixed.
  images: {
    unoptimized: true
  }
};

export default nextConfig;
