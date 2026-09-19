# Tasks: Admin Backoffice & Data Migrations Platform

## Phase 1: Admin Module Domain & Application Services

- [x] 1.1 Create [`src/modules/admin/domain/admin-authorization-service.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/domain/admin-authorization-service.ts) implementing admin validation via `ADMIN_EMAIL`, roles, and fallback identity
- [x] 1.2 Create [`src/modules/admin/domain/admin-repository-port.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/domain/admin-repository-port.ts) defining interfaces for system statistics, migration status inspection, and atomic migration execution
- [x] 1.3 Create [`src/modules/admin/application/get-admin-system-stats-query.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/application/get-admin-system-stats-query.ts) to aggregate bookmark volume by status and record DB latency
- [x] 1.4 Create [`src/modules/admin/application/get-legacy-migration-status-query.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/application/get-legacy-migration-status-query.ts) to inspect count of unassigned `local-user-1` records
- [x] 1.5 Create [`src/modules/admin/application/migrate-legacy-bookmarks-command.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/application/migrate-legacy-bookmarks-command.ts) with Zod input validation and atomic migration execution

## Phase 2: Infrastructure Layer & Container Wiring

- [x] 2.1 Create [`src/modules/admin/infrastructure/drizzle-admin-repository.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/infrastructure/drizzle-admin-repository.ts) implementing `AdminRepositoryPort` with Drizzle ORM queries and atomic `UPDATE bookmarks ... RETURNING` statements
- [x] 2.2 Wire `AdminAuthorizationService`, `DrizzleAdminRepository`, queries, and command handlers into [`src/shared/infrastructure/container.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/container.ts)
- [x] 2.3 Add inline SVG icons (`ShieldCheckIcon`, `DatabaseIcon`, `ActivityIcon`, `ArrowRightIcon`, `RefreshCwIcon`, `AlertTriangleIcon`) to [`src/shared/ui/icons.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/ui/icons.tsx)

## Phase 3: Route Layout & Authorization Guards

- [x] 3.1 Create [`src/modules/admin/ui/forbidden-view.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/ui/forbidden-view.tsx) rendering an accessible Scandinavian 403 Forbidden screen with return link to `/`
- [x] 3.2 Create [`src/routes/admin.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/admin.tsx) as the root admin layout route with dual-stage authorization guard (302 redirect for unauthenticated, 403 response for non-admin)
- [x] 3.3 Register nested admin routes in [`src/routes.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes.ts) using `@react-router/dev/routes` layout configuration

## Phase 4: Route Handlers & Server Actions

- [x] 4.1 Create [`src/routes/admin._index.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/admin._index.tsx) with loader invoking `GetAdminSystemStatsQuery` and attaching `Server-Timing` headers
- [x] 4.2 Create [`src/routes/admin.migrations.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/admin.migrations.tsx) with loader inspecting legacy migration status and action handling `intent === "migrate_legacy"`
- [x] 4.3 Ensure actions and loaders in admin routes propagate standard W3C `Server-Timing` headers

## Phase 5: UI Components & Scandinavian Design System

- [x] 5.1 Create [`src/modules/admin/ui/admin-layout.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/ui/admin-layout.tsx) featuring responsive header, plain-text user identity (NO avatars), return link, and tab navigation
- [x] 5.2 Create [`src/modules/admin/ui/system-health-card.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/ui/system-health-card.tsx) rendering DB status, latency telemetry, and aggregate bookmark status badges
- [x] 5.3 Create [`src/modules/admin/ui/migration-runner-panel.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/ui/migration-runner-panel.tsx) displaying pre-flight inspection, interactive trigger button, loading spinners, and execution summary
- [x] 5.4 Add admin styling in [`src/app.css`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/app.css) conforming to design tokens, WCAG AA contrast (min 4.5:1 text, 3:1 UI), min 44x44px mobile touch targets, and all interactive states

## Phase 6: Automated Tests & Verification

- [x] 6.1 Create [`src/modules/admin/domain/__tests__/admin-authorization-service.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/domain/__tests__/admin-authorization-service.test.ts) covering matching/mismatching admin emails, roles, and guest states
- [x] 6.2 Create [`src/modules/admin/application/__tests__/migrate-legacy-bookmarks-command.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/application/__tests__/migrate-legacy-bookmarks-command.test.ts) testing migration command validation and execution
- [x] 6.3 Create [`src/modules/admin/infrastructure/__tests__/drizzle-admin-repository.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/admin/infrastructure/__tests__/drizzle-admin-repository.test.ts) testing atomic SQLite migration and idempotent re-runs
- [x] 6.4 Execute full test suite `npm test` and verify zero regressions across existing bookmark and auth test suites

