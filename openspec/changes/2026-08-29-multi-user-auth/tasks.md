# Tasks: Multi-User Authentication and Tenant Isolation (Better-Auth + Drizzle)

## Phase 1: Dependencies & Database Schema Migration

- [x] 1.1 Install `better-auth` and `@better-auth/cli` dependencies in `package.json`
- [x] 1.2 Update [`src/shared/infrastructure/db/schema.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/db/schema.ts) with `user`, `session`, `account`, and `verification` table definitions
- [x] 1.3 Update `bookmarksTable` in [`src/shared/infrastructure/db/schema.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/db/schema.ts) to add foreign key constraint referencing `user.id` (`onDelete: "cascade"`) and composite index on `(user_id, status)`
- [x] 1.4 Update fallback table creation logic in [`src/shared/infrastructure/db/client.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/db/client.ts) to include auth tables and foreign keys
- [x] 1.5 Create a backfill/migration utility (`src/shared/infrastructure/db/migrations/backfill-local-user.ts`) to seed a placeholder user for existing `local-user-1` bookmarks
- [x] 1.6 Run database migration via `npm run db:push` to apply new schema to local and test databases

## Phase 2: Server Auth Engine & API Route Handler

- [x] 2.1 Create [`src/shared/infrastructure/auth/auth.server.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/auth/auth.server.ts) initializing Better-Auth with Drizzle adapter and GitHub/Google OAuth providers
- [x] 2.2 Create [`src/shared/infrastructure/auth/auth.client.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/auth/auth.client.ts) exporting Better-Auth React client (`authClient`)
- [x] 2.3 Create catch-all API resource route [`src/routes/api.auth.$.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/api.auth.$.ts) with `loader` and `action` delegating to `auth.handler(request)`
- [x] 2.4 Add environment variable definitions (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) to `.env.example` and `src/env.d.ts`

## Phase 3: Route Protection & Tenant Context Integration

- [x] 3.1 Create protected layout route [`src/routes/_authenticated.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/_authenticated.tsx) verifying session via `auth.api.getSession` and redirecting unauthenticated visitors to `/login`
- [x] 3.2 Update [`src/routes.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes.ts) to register `api/auth/*` and nest protected routes (`dashboard.tsx`) under `_authenticated.tsx`
- [x] 3.3 Refactor [`src/routes/dashboard.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/dashboard.tsx) to eliminate `DEFAULT_USER_ID`, extract the authenticated `userId` from the session in loaders and actions, and pass it to domain handlers
- [x] 3.4 Deprecate and remove legacy passcode validation functions from [`src/modules/auth/application/auth-session.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/auth/application/auth-session.ts)

## Phase 4: UI Updates (OAuth Login & Authenticated Navigation)

- [x] 4.1 Redesign [`src/routes/login.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/login.tsx) with branded "Sign in with GitHub" and "Sign in with Google" OAuth buttons
- [x] 4.2 Add error alert handling in `login.tsx` for OAuth callback cancellations and authentication failures
- [x] 4.3 Add user display name/email and Sign Out action button in [`src/routes/_authenticated.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/_authenticated.tsx) header
- [x] 4.4 Implement sign-out client handler using `authClient.signOut()` with immediate redirection to `/login`

## Phase 5: Testing & Verification

- [x] 5.1 Write unit tests for Better-Auth configuration and Drizzle adapter mapping in `src/shared/infrastructure/auth/__tests__/auth.server.test.ts`
- [x] 5.2 Write integration tests for protected route guard (`_authenticated.tsx`) verifying HTTP 302 redirects for unauthenticated requests and 200 OK for valid sessions
- [x] 5.3 Write multi-tenant isolation integration tests verifying that User A cannot view, query, or mutate User B's bookmarks
- [x] 5.4 Run complete test suite (`npm test`) to ensure zero regressions across existing bookmark ingestion, categorization, and optimistic UI features
