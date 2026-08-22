# Latency Telemetry and Optimistic UI Specification

## Purpose
Defines the functional and performance requirements for zero-latency client-side optimistic checklist interactions, single-trip atomic database mutations, and W3C `Server-Timing` telemetry header propagation for the Offload bookmarking platform running on Vercel Serverless and Turso Cloud SQLite.

## Requirements

### Requirement: Optimistic Visited Checklist State
The web application MUST optimistically update the reading list checklist UI immediately upon user interaction without waiting for server response or loader revalidation.

#### Scenario: Instant Visited UI Transition on Checkbox Click
- GIVEN a user viewing the pending bookmarks checklist on the Dashboard
- WHEN the user clicks the completion checkbox button for a bookmark
- THEN the client application MUST immediately submit the `mark_visited` action via React Router fetcher
- AND the application MUST immediately remove the bookmark from the rendered pending list with 0ms perceived delay
- AND any category or subcategory folder that becomes empty as a result MUST be hidden or reflect zero remaining items immediately.

#### Scenario: Instant Visited UI Transition on Title Link Click
- GIVEN a user viewing the pending bookmarks checklist on the Dashboard
- WHEN the user clicks the external title link of a bookmark
- THEN the browser MUST open the bookmark URL in a new tab
- AND the client application MUST immediately submit the `mark_visited` action
- AND the bookmark MUST immediately be removed from the pending checklist view.

#### Scenario: Mobile Touch Target Accessibility
- GIVEN a user interacting with the checklist on a mobile device or touch screen
- WHEN rendering the completion checkbox or action triggers
- THEN the interactive touch target area MUST be at least 44x44 CSS pixels complying with WCAG 2.1 AA guidelines.

---

### Requirement: Optimistic Counter Updates
The application MUST immediately synchronize tab counters and folder badge indicators when an action is in flight.

#### Scenario: Immediate Badge Decrement and Increment on Mark Visited
- GIVEN the Reading List tab counter showing $N$ items and Archive tab counter showing $M$ items
- WHEN a user marks a bookmark as visited
- THEN the Reading List tab counter MUST immediately decrement to $N - 1$
- AND the Archive tab counter MUST immediately increment to $M + 1$
- AND the parent category count badge MUST decrement by 1 immediately.

#### Scenario: Multiple In-flight Concurrent Submissions
- GIVEN a user rapidly clicking completion checkboxes on $K$ distinct bookmarks
- WHEN multiple fetchers are concurrently in-flight with `intent === "mark_visited"`
- THEN the application MUST aggregate all in-flight marked bookmark IDs
- AND decrement the Reading List tab counter by $K$
- AND increment the Archive tab counter by $K$ without UI flickering or race conditions.

---

### Requirement: Action Failure Graceful Rollback
The application MUST gracefully revert optimistic UI changes if the backend action execution fails.

#### Scenario: Automatic Rollback on Server Action Failure
- GIVEN a bookmark that has been optimistically removed from the pending list
- WHEN the background action request fails due to a network interruption or server error (e.g. HTTP 500 or response containing `{ error: string }`)
- THEN the fetcher state transition MUST trigger a rollback
- AND the bookmark MUST reappear in its original pending category and subcategory folder
- AND tab counters MUST restore their previous values.

---

### Requirement: Server-Timing Telemetry Header Injection
The server application MUST record high-resolution timing metrics for critical execution phases and attach standard W3C `Server-Timing` headers to HTTP responses.

#### Scenario: Server-Timing Header on Route Loaders
- GIVEN an authenticated request to the dashboard loader (`GET /`)
- WHEN the loader executes authentication verification and folder tree database queries
- THEN the response MUST include a `Server-Timing` HTTP header
- AND the header MUST contain metric entries formatted according to W3C specification with duration in milliseconds (e.g. `auth;dur=..., db;dur=..., total;dur=...`).

#### Scenario: Server-Timing Header on Route Actions
- GIVEN a request to the dashboard route action (`POST /` with `intent: "mark_visited"`)
- WHEN the action processes the form data and performs the database mutation
- THEN the action response MUST include a `Server-Timing` HTTP header containing metrics for request processing and database execution time.

#### Scenario: Turso Connection Latency Diagnostic Measurement
- GIVEN an operator or diagnostic probe querying the database status
- WHEN the diagnostic utility executes a ping / lightweight query against Turso Cloud
- THEN the system MUST measure and log the round-trip network and execution latency in milliseconds.

---

### Requirement: Transparent Repository Telemetry Decorator
The system MUST collect database operation telemetry transparently through a repository Decorator pattern using request-scoped execution context (`AsyncLocalStorage`), requiring zero timing code in application command/query handlers or domain models.

#### Scenario: Automatic Timing Capture on Repository Port Invocations
- GIVEN an active server execution context wrapped in `withServerTiming`
- WHEN any query handler or command handler invokes any method on `BookmarkRepositoryPort` (e.g. `findById`, `save`, `update`, `markAsVisited`, `findAllByUserId`)
- THEN `TelemetryBookmarkRepositoryDecorator` MUST automatically intercept the invocation and record the execution duration in the active `ServerTiming` context
- AND application command/query handlers and domain services MUST NOT import or reference telemetry utilities directly.

---

### Requirement: Atomic Repository Mutation
The database repository MUST execute the status transition from `pending` to `visited` in a single atomic SQL round-trip to Turso.

#### Scenario: Single SQL Query Execution for Bookmark State Transition
- GIVEN a bookmark with status `pending` belonging to user $U$
- WHEN `markBookmarkVisitedHandler` executes for bookmark ID $B$ and user $U$
- THEN the repository MUST execute a single atomic `UPDATE bookmarks SET status = 'visited', updated_at = :now WHERE id = :id AND user_id = :userId RETURNING *` query
- AND the repository MUST NOT execute a separate `findById` query prior to the update
- AND the handler MUST publish a `BookmarkVisitedEvent` upon successful mutation.

#### Scenario: Non-existent or Unauthorized Bookmark Mutation Handling
- GIVEN a bookmark ID that does not exist in the database or belongs to another user
- WHEN `markBookmarkVisitedHandler` attempts atomic mutation
- THEN the single SQL update query MUST return 0 updated rows
- AND the repository MUST throw a `BookmarkNotFound` or `Unauthorized` domain exception
- AND the handler MUST NOT publish a `BookmarkVisitedEvent`.
