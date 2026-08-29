import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("favicon.ico", "routes/favicon.ico.ts"),
  layout("routes/_authenticated.tsx", [
    index("routes/dashboard.tsx"),
  ]),
] satisfies RouteConfig;
