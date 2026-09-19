import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("favicon.ico", "routes/favicon.ico.ts"),

  // Protected User Application
  layout("routes/_authenticated.tsx", [
    index("routes/dashboard.tsx"),
  ]),

  // Admin Backoffice Subsystem
  layout("routes/admin.tsx", [
    index("routes/admin._index.tsx"),
    route("migrations", "routes/admin.migrations.tsx"),
  ]),
] satisfies RouteConfig;

