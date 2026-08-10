import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("favicon.ico", "routes/favicon.ico.ts"),
  index("routes/dashboard.tsx"),
] satisfies RouteConfig;
