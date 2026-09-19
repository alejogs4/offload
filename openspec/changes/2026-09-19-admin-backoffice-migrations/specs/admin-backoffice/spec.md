# Admin Backoffice & Data Migrations Specification

## Purpose
Defines the functional, security, accessibility, and operational requirements for the Administrative Backoffice platform and the Legacy Data Migration runner in Offload.

## Requirements

### Requirement: Admin Authorization and Route Protection
The application MUST protect all administrative routes (`/admin`, `/admin/*`) behind a dual-tier authorization guard validating session existence and administrative role/email eligibility.

#### Scenario: Unauthenticated User Redirected to Login
- GIVEN an unauthenticated visitor with no valid session cookie
- WHEN the visitor attempts to navigate to `/admin` or `/admin/migrations`
- THEN the application MUST immediately respond with an HTTP `302 Redirect` to `/login`
- AND the application MUST NOT render any administrative UI or execute administrative queries.

#### Scenario: Authenticated Non-Admin User Access Rejected
- GIVEN a user with a valid session cookie whose identity does not match the configured `ADMIN_EMAIL` or administrative role
- WHEN the user navigates to `/admin` or `/admin/migrations`
- THEN the application MUST return an HTTP `403 Forbidden` response
- AND the application MUST display a clear "Access Forbidden" message explaining insufficient privileges
- AND the UI MUST provide a navigation link back to the main workspace (`/`).

#### Scenario: Authenticated Admin User Access Granted
- GIVEN a user with a valid session cookie whose identity matches the configured `ADMIN_EMAIL` or administrative role
- WHEN the user navigates to `/admin` or `/admin/migrations`
- THEN the application MUST grant access and render the requested administrative view
- AND the application MUST attach standard `Server-Timing` telemetry headers to the response.

---

### Requirement: Administrative System Health Dashboard (`/admin`)
The application MUST provide an overview dashboard presenting key database health metrics, telemetry status, and bookmark inventory counts.

#### Scenario: Inspecting Platform Inventory Breakdown
- GIVEN an authorized administrator viewing `/admin`
- WHEN the overview page loads
- THEN the system MUST display aggregate counters for:
  - Total bookmarks registered across the platform
  - Count of bookmarks in `pending` status
  - Count of bookmarks in `visited` status
  - Count of bookmarks in `failed` status
  - Count of bookmarks in `processing` status
- AND each metric card MUST use semantic design tokens and high-contrast typography conforming to WCAG AA standards.

#### Scenario: Database Connectivity and Latency Reporting
- GIVEN an authorized administrator viewing `/admin`
- WHEN the system executes database telemetry checks
- THEN the system MUST display the database connection status (`Connected` / `Degraded` / `Disconnected`)
- AND display the measured round-trip query latency in milliseconds.

---

### Requirement: Legacy Migration Status Discovery (`/admin/migrations`)
The migration control center MUST inspect and display the status of legacy unassigned records (`userId === "local-user-1"`) prior to execution.

#### Scenario: Discovering Pending Legacy Records
- GIVEN the database contains $N$ bookmarks assigned to legacy user ID `local-user-1` ($N > 0$)
- WHEN the administrator opens `/admin/migrations`
- THEN the system MUST display a prominent migration pending indicator
- AND display the total count $N$ of unmigrated records
- AND display the target destination user ID / email corresponding to the active administrator
- AND render an enabled "Execute Migration" action button.

#### Scenario: Zero Legacy Records Pending (Up-to-Date State)
- GIVEN the database contains 0 bookmarks assigned to `local-user-1`
- WHEN the administrator opens `/admin/migrations`
- THEN the system MUST display an "All Migrations Completed" status badge
- AND show 0 pending records
- AND disable the migration execution trigger with clear explanatory text.

---

### Requirement: Atomic One-Shot Migration Execution
The application MUST execute the reassignment of legacy bookmark ownership from `local-user-1` to the active admin user atomically within a single database transaction.

#### Scenario: Successful Migration Execution
- GIVEN $N$ bookmarks currently assigned to `local-user-1` in the database ($N > 0$)
- AND an authenticated administrator with user ID $A$
- WHEN the administrator clicks the "Execute Migration" action button
- THEN the server action MUST execute an atomic `UPDATE bookmarks SET user_id = :adminUserId, updated_at = :now WHERE user_id = 'local-user-1'` within a database transaction
- AND upon completion, the system MUST return a success summary detailing the exact count $N$ of migrated records
- AND the UI MUST update to reflect 0 remaining legacy records without requiring a manual page refresh.

#### Scenario: Idempotent Migration Execution
- GIVEN that all legacy records have already been migrated (0 records matching `user_id = 'local-user-1'`)
- WHEN a migration action is triggered
- THEN the server MUST execute safely without modifying any rows
- AND return a response indicating 0 records updated
- AND no error or data corruption MUST occur.

#### Scenario: Transactional Integrity on Database Failure
- GIVEN an active migration in progress
- WHEN an unexpected database error occurs during the update statement
- THEN the transaction MUST automatically rollback completely
- AND no bookmark records MUST remain in a partially modified state
- AND the server MUST return an actionable error message to the administrator.

---

### Requirement: UI/UX & Design System Constraints
The administrative interface MUST adhere to Scandinavian design principles, accessibility benchmarks, and explicit data representation constraints.

#### Scenario: Strict Prohibition of Avatar and Image Elements
- GIVEN any view in the admin backoffice (`/admin`, `/admin/migrations`, or navigation headers)
- WHEN user identifiers or administrative accounts are rendered
- THEN the application MUST display the user email or identifier as formatted plain text
- AND the application MUST NOT render any user avatar images, profile picture placeholders, or image columns.

#### Scenario: Accessible Interactive Elements & Touch Targets
- GIVEN an administrator navigating the backoffice on mobile, tablet, or desktop devices
- WHEN rendering navigation tabs, action buttons, filter triggers, or links
- THEN all interactive touch target bounding boxes MUST be at least 44x44 CSS pixels
- AND all text elements MUST maintain at least 4.5:1 contrast against their surface background (WCAG AA)
- AND all non-text UI controls and borders MUST maintain at least 3:1 contrast ratio.

#### Scenario: Consistent Inline SVG Iconography
- GIVEN visual indicators used across the backoffice (e.g. status shields, database icons, directional arrows, activity monitors)
- WHEN icons are displayed in the DOM
- THEN the application MUST render crisp inline SVG elements with `aria-hidden="true"`
- AND MUST NOT use emoji characters or external icon font stylesheets.
