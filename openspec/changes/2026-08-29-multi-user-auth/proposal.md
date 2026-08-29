# Proposal: Multi-User Authentication and Tenant Isolation (Better-Auth + Drizzle)

## Intent
Transform Offload from a single-tenant workspace guarded by a shared global passcode into a secure, multi-tenant bookmarking platform powered by [Better-Auth](https://www.better-auth.com) and Drizzle ORM, with native Google and GitHub OAuth providers, stateful database sessions, strict per-tenant data isolation, and protected route layout boundaries.

## Problem Statement

1. **Shared Passcode & Zero Identity**:
   The current authentication mechanism (`src/modules/auth/application/auth-session.ts`) relies on a single shared `APP_PASSWORD` environment variable. There is no user identity, email verification, or profile information. Anyone with the passcode accesses the exact same bookmark stream.
2. **Hardcoded User Identifier (`local-user-1`)**:
   All domain commands, queries, and repository operations currently default to `DEFAULT_USER_ID = "local-user-1"` in `src/routes/dashboard.tsx`. The database cannot isolate data across distinct users.
3. **Absence of Relational Integrity & Performance Indexing**:
   The `bookmarks` table has a loose `user_id` string column with no foreign key constraint to a canonical user entity and no composite index on `(user_id, status)`. As bookmark volume grows across multiple users, full-table scans will degrade query performance.
4. **Lack of Modern Auth Standards**:
   The existing system lacks standard modern authentication features such as OAuth 2.0 / OIDC (Google, GitHub), CSRF protection, secure cookie rotation, session revocation, and secure token lifecycle management.

## Scope

### In Scope
- **Better-Auth Core & Drizzle Adapter Integration**:
  - Install `better-auth` and configure the Drizzle SQLite/LibSQL adapter targeting Turso / local SQLite.
  - Define canonical Drizzle schemas for `user`, `session`, `account`, and `verification` tables in `src/shared/infrastructure/db/schema.ts`.
- **OAuth Providers & Extensible Auth**:
  - Configure GitHub and Google OAuth providers with client credentials from environment variables.
  - Provide an extensible foundation for Passkeys / Email-Password when needed.
- **Route Protection & Catch-All API Handler**:
  - Implement catch-all route handler `src/routes/api.auth.$.ts` mounting `auth.handler(request)`.
  - Implement protected layout boundary `src/routes/_authenticated.tsx` that validates sessions via `auth.api.getSession` and redirects unauthenticated visitors to `/login`.
  - Update `src/routes.ts` to wrap private routes under the `_authenticated` layout.
- **Strict Tenant Isolation & Schema Migration**:
  - Add foreign key constraint on `bookmarksTable.userId` referencing `user.id` (`onDelete: "cascade"`).
  - Add composite index on `(user_id, status)` for fast dashboard and checklist filtering.
  - Eliminate all usages of `DEFAULT_USER_ID = "local-user-1"`; extract authenticated `userId` directly from active session.
  - Provide a migration/seed script to associate legacy `local-user-1` records with the first registered administrator or backfill user.
- **Client-Side Auth State & UI Header**:
  - Create React Better-Auth client (`src/shared/infrastructure/auth/auth.client.ts`).
  - Redesign `src/routes/login.tsx` to provide modern OAuth login buttons (Google, GitHub) alongside clean status feedback.
  - Add user profile avatar, name/email display, and one-click Sign Out action to the dashboard layout header.

### Out of Scope
- Complex hierarchical multi-tenant organizations (Teams, Workspaces, RBAC permissions) — Offload is scoped to individual personal accounts.
- Enterprise SAML SSO / LDAP integration.
- SMS-based two-factor authentication (OAuth and WebAuthn/Passkeys are prioritized).

## Capabilities

### New Capabilities
- `multi-user-auth`: End-to-end multi-tenant authentication engine managing user profiles, stateful database sessions, OAuth logins (Google & GitHub), CSRF protection, and route security boundaries.

### Modified Capabilities
- `checklist-management`: All folder queries and checklist actions require an authenticated user context and operate strictly against the caller's `user_id`.
- `bookmark-ingestion`: Bookmark creation and background enrichment pipelines bind records explicitly to the authenticated owner's `user_id`.
- `passcode-auth` *(Deprecated)*: Replaced entirely by Better-Auth multi-user authentication.

## Approach

1. **Better-Auth Server Configuration**:
   Create `src/shared/infrastructure/auth/auth.server.ts` initializing `betterAuth` with `drizzleAdapter(db, { provider: "sqlite", schema })`, configured social providers (`google`, `github`), and secure session cookie settings.
2. **Schema Definition & Migration**:
   Expand `src/shared/infrastructure/db/schema.ts` with Better-Auth standard tables (`user`, `session`, `account`, `verification`) and augment `bookmarksTable` with `references(() => user.id, { onDelete: "cascade" })` and index `index("bookmarks_user_id_status_idx").on(bookmarks.userId, bookmarks.status)`. Execute migration via `drizzle-kit push` / migration scripts.
3. **Protected Layout Boundary**:
   Create `src/routes/_authenticated.tsx` acting as the React Router v7 layout guard. The loader invokes `auth.api.getSession({ headers: request.headers })`. If no session is returned, it responds with an immediate HTTP 302 redirect to `/login`. If valid, it passes `user` and `session` down to child route outlets.
4. **Tenant-Aware Query & Action Pipeline**:
   Update `src/routes/dashboard.tsx` action and loader to retrieve `user.id` from `session` (or layout loader data) and pass it directly to `getFolderTreeQuery.execute(user.id)`, `createBookmarkHandler.execute({ ..., userId: user.id })`, and `markBookmarkVisitedHandler.execute(bookmarkId, user.id)`.
5. **Backfill Strategy**:
   Implement a database migration script that checks if legacy bookmarks with `user_id = 'local-user-1'` exist. If so, create a placeholder migration user or assign them to the first user created during initial OAuth onboarding.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add `better-auth` and `@better-auth/cli` dependencies |
| `src/shared/infrastructure/db/schema.ts` | Modified | Add `user`, `session`, `account`, `verification` tables and composite index + FK on `bookmarks` |
| `src/shared/infrastructure/db/client.ts` | Modified | Ensure fallback schema initialization handles auth tables and foreign keys |
| `src/shared/infrastructure/auth/auth.server.ts` | New | Server-side Better-Auth instance with Drizzle SQLite adapter & OAuth providers |
| `src/shared/infrastructure/auth/auth.client.ts` | New | Client-side Better-Auth React client (`createAuthClient`) |
| `src/routes/api.auth.$.ts` | New | React Router v7 resource route forwarding all `/api/auth/*` requests to `auth.handler` |
| `src/routes/_authenticated.tsx` | New | Protected layout route with loader authentication check and header shell |
| `src/routes.ts` | Modified | Configure route tree nesting under `_authenticated.tsx` and register `api/auth/*` |
| `src/routes/login.tsx` | Modified | Redesign login interface with Google and GitHub OAuth sign-in buttons |
| `src/routes/dashboard.tsx` | Modified | Remove `DEFAULT_USER_ID`; read user from session; route actions use dynamic `userId` |
| `src/modules/auth/application/auth-session.ts` | Deprecated | Remove old passcode verification helpers |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing bookmarks inaccessible after schema migration | Medium | Run backfill migration script to reassign `local-user-1` bookmarks to the first authenticated user account or create a linked fallback user. |
| OAuth redirect URL mismatch in development vs production | Medium | Use dynamic `baseURL` derived from `BETTER_AUTH_URL` or request origin; document standard redirect URIs (`/api/auth/callback/google`, `/api/auth/callback/github`). |
| Database foreign key violations during deployment | Low | Use Drizzle migrations with SQLite foreign key pragmas enabled; backfill existing orphaned records before enforcing foreign key constraints. |
| Session verification latency on serverless edge | Low | Stateful session verification runs as an indexed single-row query on `session.token` (<5ms on Turso/SQLite); measured transparently via `Server-Timing`. |

## Rollback Plan
1. Revert `src/routes.ts` and `src/routes/dashboard.tsx` to read from `DEFAULT_USER_ID = "local-user-1"` and restore `passcode-auth` check in `src/routes/login.tsx`.
2. Keep the auth tables in the database schema (non-destructive) or drop `user`, `session`, `account`, `verification` tables if a full rollback is required.
3. Revert `package.json` dependencies.

## Success Criteria
- [ ] Users can sign in seamlessly via Google OAuth and GitHub OAuth.
- [ ] Unauthenticated requests to `/` or protected subpaths are immediately redirected to `/login`.
- [ ] All bookmark operations (create, view, mark visited, search) are strictly scoped to the authenticated user's `userId`.
- [ ] Users cannot view or modify bookmarks belonging to other accounts under any circumstances.
- [ ] Sign out invalidates the session in the database, clears session cookies, and redirects to `/login`.
- [ ] Legacy bookmarks from `local-user-1` are safely migrated without data loss.
- [ ] Test suite passes 100% with full coverage of auth routes, guards, and multi-tenant repository queries.
