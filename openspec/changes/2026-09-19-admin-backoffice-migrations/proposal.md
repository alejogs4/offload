# Proposal: Admin Backoffice & Data Migrations Platform

## Intent
Provide a secure, isolated administrative control panel (`/admin` and `/admin/migrations`) to inspect database health, monitor platform telemetry, and execute safe, idempotent one-shot data migrations transitioning legacy single-user bookmark records (`local-user-1`) to multi-user authenticated admin accounts.

## Problem Statement
1. **Single-User Hardcoding & Legacy Debt**:
   The platform initially stored all bookmarks under `DEFAULT_USER_ID = "local-user-1"`. As authentication expands to support distinct user accounts, existing legacy records remain trapped under the synthetic `local-user-1` identifier without a safe, user-facing migration mechanism.
2. **Lack of Administrative & Operational Observability**:
   Operators have no dedicated backoffice interface to inspect database size, category distribution, failed scraper jobs, or platform health metrics without querying Turso / SQLite directly.
3. **Absence of In-App Migration Tooling**:
   Executing manual SQL scripts against production cloud databases carries operational risk (accidental overwrites, downtime, lack of transaction auditing). A controlled, one-shot migration runner with preview and execution capabilities is required.
4. **Security & Access Isolation**:
   Admin features must not be exposed to regular users. A dedicated authorization layer is needed to distinguish unauthenticated visitors (redirected to `/login`) from authenticated non-admin users (served an explicit HTTP `403 Forbidden` response), verified against `ADMIN_EMAIL` / administrative role configurations.

## Scope

### In Scope
- **Admin Authorization & Route Guard**:
  - Single-user administrative authorization evaluating `ADMIN_EMAIL` environment variable or admin role claims.
  - Nested admin route layout (`routes/admin.tsx` / `routes/admin._index.tsx` / `routes/admin.migrations.tsx`) enforcing strict session and role validation.
  - Clean separation between unauthenticated requests (`302 Redirect` to `/login`) and authenticated non-admin requests (`403 Forbidden` error screen).
- **Admin Backoffice Dashboard (`/admin`)**:
  - System health overview (database connection status, Turso latency telemetry, bookmark inventory breakdown: pending, visited, failed, processing).
  - Quick action links to the migration runner and system diagnostics.
- **Migration Control Center (`/admin/migrations`)**:
  - Live discovery of legacy unassigned bookmarks (`userId === "local-user-1"`).
  - Pre-flight migration inspection displaying target admin account, number of impacted records, and category breakdown.
  - Single-click atomic execution trigger reassigning legacy records to the active admin user ID within a database transaction.
  - Post-migration audit summary and idempotent status reporting.
- **Scandinavian UI/UX Design System Compliance**:
  - Semantic design tokens (`--bg-canvas`, `--ink-primary`, `--border-default`, `--status-active`, etc.).
  - Minimum WCAG AA contrast compliance across all text (4.5:1) and interactive UI elements (3:1).
  - Comprehensive interactive states: hover, active, focus-visible, loading spinners, empty states.
  - Crisp inline SVG icons (no external icon dependencies or random emojis).
  - Mobile touch targets (min 44x44px) and PWA safe-area padding.
  - Strict compliance with user constraint: **NO user avatars or image columns in user tables or UI**.

### Out of Scope
- User avatars or profile picture upload/display (explicitly disallowed).
- Complex multi-tenant RBAC with custom permission matrices (single-user admin authorization using `ADMIN_EMAIL` fulfills requirements).
- Automated cron-based background schema migrations (Drizzle Kit CLI remains standard for DDL schema changes).

## Capabilities

### New Capabilities
- `admin-backoffice`: Route-level admin authorization guard, administrative dashboard (`/admin`), and transactional one-shot migration runner (`/admin/migrations`) for reassigning legacy bookmark ownership.

### Modified Capabilities
- `passcode-auth`: Extended session context capable of resolving authenticated user identity/email against admin authorization policies.

## Approach

1. **Domain & Application Layer**:
   - Define `AdminAuthorizationService` in `src/modules/admin/domain/admin-authorization-service.ts` validating user identity against `ADMIN_EMAIL` / admin role.
   - Implement `MigrateLegacyBookmarksCommandHandler` in `src/modules/admin/application/migrate-legacy-bookmarks-command.ts` to execute atomic ownership updates (`local-user-1` -> `targetAdminUserId`) in a single database transaction.
   - Implement `GetAdminSystemStatsQuery` and `GetLegacyMigrationStatusQuery` in `src/modules/admin/application/` to calculate system health metrics and unassigned record counts.
2. **Infrastructure Layer**:
   - Implement `DrizzleAdminRepository` in `src/modules/admin/infrastructure/drizzle-admin-repository.ts` providing atomic transaction execution and aggregate metrics queries.
   - Wire dependencies into `src/shared/infrastructure/container.ts`.
3. **Route & Guard Architecture**:
   - Configure admin routes in `src/routes.ts`: `admin` layout wrapping `admin/index` and `admin/migrations`.
   - Layout loader verifies authentication and admin privileges, returning `403 Forbidden` response data if unauthorized.
4. **UI & Design System**:
   - Construct reusable admin components (`AdminHeader`, `AdminNavTabs`, `SystemHealthCard`, `MigrationRunnerPanel`, `ForbiddenView`).
   - Implement inline SVG icons (`ShieldCheckIcon`, `DatabaseIcon`, `ArrowRightIcon`, `ActivityIcon`, `RefreshCwIcon`, `AlertTriangleIcon`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/admin/domain/admin-authorization-service.ts` | New | Domain service evaluating admin eligibility via `ADMIN_EMAIL` / role |
| `src/modules/admin/domain/admin-repository-port.ts` | New | Port interface for system metrics and legacy data migration |
| `src/modules/admin/application/get-admin-system-stats-query.ts` | New | Query handler computing platform totals, status breakdown, and Turso latency |
| `src/modules/admin/application/get-legacy-migration-status-query.ts` | New | Query handler inspecting count of `local-user-1` records |
| `src/modules/admin/application/migrate-legacy-bookmarks-command.ts` | New | Command handler executing atomic ownership migration within a transaction |
| `src/modules/admin/infrastructure/drizzle-admin-repository.ts` | New | Drizzle ORM implementation of `AdminRepositoryPort` |
| `src/modules/admin/ui/admin-layout.tsx` | New | Layout component with admin navigation, header, and active tab styling |
| `src/modules/admin/ui/system-health-card.tsx` | New | Dashboard widget displaying database status and record counters |
| `src/modules/admin/ui/migration-runner-panel.tsx` | New | Interactive migration tool with pre-flight check, action trigger, and results |
| `src/modules/admin/ui/forbidden-view.tsx` | New | 403 Forbidden access denial component with return link |
| `src/routes/admin.tsx` | New | Root admin route layout enforcing auth guard |
| `src/routes/admin._index.tsx` | New | Backoffice overview page (`/admin`) |
| `src/routes/admin.migrations.tsx` | New | Migration control room page (`/admin/migrations`) |
| `src/routes.ts` | Modified | Register `/admin` and `/admin/migrations` routes |
| `src/shared/ui/icons.tsx` | Modified | Add required admin inline SVGs (Shield, Activity, Database, etc.) |
| `src/app.css` | Modified | Add admin layout and component CSS utilizing existing design tokens |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Incomplete migration under high concurrency | Low | Execute migration inside an atomic SQLite transaction (`db.transaction()`) with row-level locks or single-statement update. |
| Non-admin accessing sensitive admin endpoints | Low | Implement robust dual-stage guard: check session authentication (`302` if unauthenticated) and verify `ADMIN_EMAIL` (`403` if authenticated non-admin). |
| Repeated execution modifying wrong records | Very Low | Update query strictly targets `where user_id = 'local-user-1'`. Once migrated, subsequent executions find 0 records and safely return a 0-count idempotent response. |
| UI layout breaking on mobile screens | Low | Responsive CSS grid and flex layouts with minimum 44x44px touch targets and horizontal scrolling tables. |

## Rollback Plan
1. Revert route registration in `src/routes.ts` to immediately take `/admin` routes offline.
2. If a migration needs to be reverted, run an administrative compensation command: `UPDATE bookmarks SET user_id = 'local-user-1' WHERE user_id = :adminUserId AND updated_at >= :migrationTimestamp`.
3. Revert source code changes cleanly without touching unrelated bookmark ingestion or dashboard features.

## Success Criteria
- [ ] Unauthenticated requests to `/admin` or `/admin/migrations` are redirected to `/login` (`302`).
- [ ] Authenticated non-admin requests to `/admin` or `/admin/migrations` are rejected with HTTP `403 Forbidden`.
- [ ] Authenticated admin users can access `/admin` and view accurate live database metrics (total bookmarks, pending, visited, failed).
- [ ] Authenticated admin users can access `/admin/migrations` and inspect legacy `local-user-1` records.
- [ ] Triggering the migration atomically updates all `local-user-1` records to the active admin user ID.
- [ ] Subsequent triggers of the migration report 0 pending records (idempotent).
- [ ] UI strictly complies with Scandinavian Design tokens, WCAG AA contrast, and zero avatar/image columns.
- [ ] 100% of unit, integration, and route guard tests pass.
