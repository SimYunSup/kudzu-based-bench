import type { Config } from "@react-router/dev/config";

export default {
  // GitHub Pages can't run SSR — fully static prerender.
  ssr: false,
  basename: "/kudzu-based-bench/form-react-router/",
  async prerender() {
    return ["/", "/session", "/review", "/done"];
  }
} satisfies Config;
