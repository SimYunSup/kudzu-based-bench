import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/step1.tsx"),
  route("session", "routes/step2.tsx"),
  route("review", "routes/step3.tsx"),
  route("done", "routes/done.tsx")
] satisfies RouteConfig;
