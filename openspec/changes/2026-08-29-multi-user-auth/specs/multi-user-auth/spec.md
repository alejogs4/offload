# Multi-User Authentication and Tenant Isolation Specification

## Purpose
Defines the functional, security, and architectural requirements for multi-tenant user authentication, OAuth identity provider integration (Google & GitHub), stateful database session verification, route layout protection, and strict tenant data isolation for the Offload platform.

## Requirements

### Requirement: Multi-Provider OAuth Authentication
The authentication engine MUST support social OAuth 2.0 / OIDC authentication for GitHub and Google identity providers using Better-Auth.

#### Scenario: Successful Google OAuth Sign-In
- GIVEN an unauthenticated visitor on `/login`
- WHEN the user clicks the "Sign in with Google" button
- THEN the application MUST redirect the browser to the Google OAuth consent endpoint via Better-Auth client (`authClient.signIn.social({ provider: "google" })`)
- AND upon successful authorization callback at `/api/auth/callback/google`, Better-Auth MUST upsert a record in the `user` table and `account` table
- AND generate a cryptographically secure stateful session in the `session` table
- AND issue an `HttpOnly`, `SameSite=Lax`, `Secure` session cookie
- AND redirect the authenticated user to `/`.

#### Scenario: Successful GitHub OAuth Sign-In
- GIVEN an unauthenticated visitor on `/login`
- WHEN the user clicks the "Sign in with GitHub" button
- THEN the application MUST initiate the GitHub OAuth authorization workflow
- AND upon receiving the authorization code, Better-Auth MUST exchange it for an access token, fetch user profile information, create or link the user account, and persist an active session
- AND the browser MUST receive a valid session cookie and be redirected to `/`.

#### Scenario: OAuth Error or Cancellation
- GIVEN an unauthenticated visitor attempting OAuth sign-in
- WHEN the user cancels the provider consent dialog or the provider returns an error
- THEN Better-Auth MUST redirect the browser back to `/login` with an error parameter
- AND the login interface MUST render a human-readable error notification without crashing.

---

### Requirement: Protected Layout Boundary and Route Guards
The application MUST enforce authentication at the React Router v7 layout boundary before allowing access to private dashboard views, loaders, or actions.

#### Scenario: Unauthenticated Access to Protected Route
- GIVEN an unauthenticated visitor or a client without a valid session cookie
- WHEN the visitor issues an HTTP GET request to `/` or any child route under the protected layout
- THEN the `_authenticated.tsx` layout loader MUST detect the absence of an active session via `auth.api.getSession`
- AND the server MUST respond with an immediate HTTP 302 redirect to `/login`
- AND child route loaders (`dashboard.tsx`) MUST NOT execute their queries or leak internal data.

#### Scenario: Authenticated Access to Protected Layout
- GIVEN an authenticated user with a valid active session cookie
- WHEN the user accesses `/` or any protected route
- THEN `_authenticated.tsx` loader MUST resolve the active `user` and `session` entities
- AND provide the user identity to child routes via React Router outlet context or loader data
- AND render the global authenticated layout shell including the user display name/email and navigation header.

#### Scenario: Authenticated Visitor Navigating to Login Page
- GIVEN a user who already possesses an active valid session
- WHEN the user accesses `/login`
- THEN the `login.tsx` loader MUST check `auth.api.getSession`
- AND immediately redirect the user to `/`.

---

### Requirement: Catch-All Auth API Handler
The server application MUST expose an all-in-one API route handler at `/api/auth/*` to service all Better-Auth endpoints (OAuth callbacks, session checks, token verification, sign out).

#### Scenario: Dispatching Incoming Auth API Requests
- GIVEN an incoming HTTP request directed to `/api/auth/*` (e.g. `/api/auth/get-session`, `/api/auth/sign-out`, `/api/auth/callback/github`)
- WHEN the React Router resource route `api.auth.$.ts` receives the request in its `loader` or `action`
- THEN it MUST pass the native Web Standard `Request` directly to `auth.handler(request)`
- AND return the resulting Web Standard `Response` verbatim.

---

### Requirement: Strict Multi-Tenant Data Isolation
All bookmark operations, queries, and mutations MUST strictly isolate data by the authenticated user's ID, preventing any cross-tenant data leakage or tampering.

#### Scenario: User Folder Tree Isolation
- GIVEN User A (ID: `usr_123`) and User B (ID: `usr_456`) in the database
- WHEN User A accesses the dashboard
- THEN `getFolderTreeQuery.execute` MUST receive `usr_123`
- AND execute `SELECT ... FROM bookmarks WHERE user_id = 'usr_123'`
- AND the response MUST NOT include any bookmarks created by User B or legacy unlinked users.

#### Scenario: Bookmark Creation Scoped to Session User
- GIVEN an authenticated user with ID `usr_123` submitting a new bookmark URL
- WHEN the dashboard action executes `createBookmarkHandler.execute`
- THEN the command MUST bind the `userId` field to `usr_123`
- AND the inserted record in the `bookmarks` table MUST have `user_id = 'usr_123'`.

#### Scenario: Atomic Mutation Authorization Guard
- GIVEN a bookmark with ID `bmk_999` owned by User A (`usr_123`)
- WHEN User B (`usr_456`) attempts to mark `bmk_999` as visited by issuing a POST action
- THEN `markBookmarkVisitedHandler.execute("bmk_999", "usr_456")` MUST execute `UPDATE bookmarks ... WHERE id = 'bmk_999' AND user_id = 'usr_456'`
- AND because 0 rows match, the repository MUST throw a `BookmarkNotFound` exception
- AND the system MUST NOT mutate User A's bookmark.

---

### Requirement: Relational Integrity and Composite Indexing
The database schema MUST enforce relational foreign keys and optimized composite indexing between users and bookmarks.

#### Scenario: User Deletion Cascade
- GIVEN a user with $N$ associated bookmarks in the `bookmarks` table
- WHEN the user entity is deleted from the `user` table
- THEN the foreign key constraint `references(() => user.id, { onDelete: "cascade" })` MUST automatically cascade and remove all $N$ associated bookmarks.

#### Scenario: Composite Index on User ID and Status
- GIVEN the database `bookmarks` table
- WHEN queries filter bookmarks by owner and workflow status (e.g. `WHERE user_id = ? AND status = ?`)
- THEN the database engine MUST utilize the composite index `bookmarks_user_id_status_idx` on `(user_id, status)` avoiding full table scans.

---

### Requirement: Session Invalidation and Sign-Out
The application MUST support instant session revocation across both client cookies and server database records.

#### Scenario: User Sign-Out Execution
- GIVEN an authenticated user clicking the "Sign Out" button in the navigation header
- WHEN the sign-out action executes via Better-Auth client or API endpoint
- THEN Better-Auth MUST delete or invalidate the corresponding record in the `session` table
- AND clear the session cookie on the client response
- AND redirect the browser to `/login`.

---

### Requirement: Legacy Data Backfill & Migration
The system MUST provide a migration mechanism to safely reassign pre-existing `local-user-1` bookmarks to an authenticated user account without data loss.

#### Scenario: Automatic Backfill for Existing Single-Tenant Data
- GIVEN existing bookmark records in SQLite with `user_id = 'local-user-1'`
- WHEN the database migration or initial admin onboarding executes
- THEN the backfill script MUST ensure a valid user record exists for the target account
- AND update all `bookmarks` with `user_id = 'local-user-1'` to reference the target `user.id`
- AND preserve all created dates, categories, subcategories, and visit statuses intact.
