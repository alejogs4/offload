# Proposal: Latency Telemetry and Optimistic UI (Vercel + Turso)

## Intent
Eliminate perceived interaction latency when marking reading list bookmarks as visited and provide granular W3C `Server-Timing` observability across Vercel serverless function invocations and Turso remote cloud SQLite operations.

## Problem Statement
1. **WAN Round-Trip Latency in Serverless**:
   In a serverless architecture deployed on Vercel with a remote Turso Cloud SQLite database over HTTP/libSQL, each database round-trip incurs a 30–120ms WAN transit cost.
2. **Sequential Query Waterfall**:
   The current `MarkBookmarkVisitedCommandHandler` executes sequential database operations: it calls `findById` (round-trip 1: ~40–80ms) and then `update` (round-trip 2: ~40–80ms), creating an 80–160ms database waterfall before the HTTP action responds.
3. **Passive UI & Layout Latency**:
   The React Router v7 client interface operates passively when marking items as visited. When a user clicks a checkbox or opens a link, the UI waits for the action POST request to traverse the network, execute the DB queries, and complete React Router loader revalidation before updating folder counts, tab badges, and removing the item from the pending list. This introduces a 200–500ms visual lag.
4. **Lack of Performance Observability**:
   There is currently no server-side telemetry measuring database latency, authentication verification time, or route handler duration. Developers and operators cannot inspect request breakdown in browser developer tools via standard HTTP headers.

> [!NOTE]
> Fly.io deployment has been fully deprecated and removed. All architecture and optimizations target Vercel Serverless Functions paired with Turso remote cloud SQLite.

## Scope

### In Scope
- **React Router v7 Optimistic UI**:
  - Derive reactive optimistic state in [`pending-checklist-view.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/ui/pending-checklist-view.tsx) using `useFetchers()` to instantly remove marked bookmarks from the reading list.
  - Optimistically decrement Reading List counter and increment Archive counter in [`bookmark-view-tabs.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/ui/bookmark-view-tabs.tsx).
  - Recalculate dynamic folder and subcategory counters in real time.
  - Automatically rollback optimistic state if an action returns an error.
- **Server-Timing Telemetry & Latency Diagnostics**:
  - Zero-dependency `ServerTiming` utility measuring database execution, handler processing, and total request duration.
  - Attach standard W3C `Server-Timing` HTTP headers to route loaders and actions in [`dashboard.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/dashboard.tsx).
  - Diagnostic latency measurement helper to benchmark Turso connection latency.
- **Atomic Database Layer Optimization**:
  - Add atomic `markAsVisited` method in [`drizzle-bookmark-repository.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/infrastructure/drizzle-bookmark-repository.ts) using `UPDATE bookmarks SET ... RETURNING *` in a single SQL round-trip.
  - Update [`mark-bookmark-visited-command.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/mark-bookmark-visited-command.ts) to eliminate the sequential `findById` + `update` waterfall.
  - Preserve domain events dispatching (`BookmarkVisitedEvent`).

### Out of Scope
- Full-page offline persistence (IndexedDB / Service Worker background sync) — standard React Router cache and fetcher lifecycle are sufficient.
- Heavy external APM agents (Datadog, New Relic, OpenTelemetry collector daemon) — lightweight W3C `Server-Timing` headers provide instant DevTools observability with zero overhead.

## Capabilities

### New Capabilities
- `latency-telemetry-and-optimistic-ui`: W3C `Server-Timing` header generation, latency diagnostic tools, and client-side optimistic UI state derivation via React Router v7 `useFetchers()`.

### Modified Capabilities
- `checklist-management`: Reading list interactions transition instantaneously on the client with zero perceived delay while optimizing backend updates to a single SQL query.
- `bookmark-ingestion`: Extended repository port supporting single-trip atomic updates for bookmark status transitions.

## Approach

1. **Client-Side Optimistic Derivation**:
   Inspect all in-flight fetchers via React Router v7's `useFetchers()`. Any fetcher with `formData.get("intent") === "mark_visited"` identifies a bookmark ID currently being marked. Filter these IDs out of `pendingFolders` immediately during render, recalculate category counts, and adjust tab badge counters with 0ms perceived latency.
2. **Atomic Single-Trip SQL Mutation**:
   Refactor `DrizzleBookmarkRepository` to execute `UPDATE bookmarks SET status = 'visited', updated_at = :now WHERE id = :id AND user_id = :userId RETURNING *`. If the query returns a row, parse and return the evolved state; if zero rows are returned, determine if the record is missing or already visited.
3. **Telemetry & Telemetry Headers**:
   Create a lightweight `ServerTiming` helper in `src/shared/infrastructure/telemetry/server-timing.ts`. In route loaders and actions, record timings for auth verification, database queries, and handler execution. Return responses with `Server-Timing: auth;dur=1.2, db;dur=34.8;desc="Turso Query", total;dur=38.5`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/infrastructure/telemetry/server-timing.ts` | New | High-resolution performance timer producing W3C `Server-Timing` headers |
| `src/shared/infrastructure/telemetry/turso-diagnostics.ts` | New | Turso round-trip latency diagnostic helper |
| `src/modules/bookmark/domain/bookmark-repository-port.ts` | Modified | Add `markAsVisited(id, userId)` atomic method to repository port |
| `src/modules/bookmark/infrastructure/drizzle-bookmark-repository.ts` | Modified | Implement atomic `UPDATE ... RETURNING *` for `markAsVisited` |
| `src/modules/bookmark/application/mark-bookmark-visited-command.ts` | Modified | Utilize single-trip atomic repository method and publish domain event |
| `src/modules/bookmark/ui/pending-checklist-view.tsx` | Modified | Filter out in-flight marked bookmarks and handle click-to-visit |
| `src/modules/bookmark/ui/bookmark-view-tabs.tsx` | Modified | Adjust pending and archive counts based on in-flight fetchers |
| `src/modules/bookmark/ui/visited-history-view.tsx` | Modified | Optimistically render in-flight visited items in the archive view |
| `src/routes/dashboard.tsx` | Modified | Attach `Server-Timing` headers to loader and action responses; derive optimistic counts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Optimistic action fails on backend (e.g. network error / DB outage) | Low | React Router fetchers expose `fetcher.data?.error`. When an action fails, the fetcher leaves the active submitting state, automatically rolling back the UI to the loader's persisted state. |
| Zero-row update ambiguity (not found vs already visited vs wrong user) | Low | Handle empty `RETURNING` array cleanly in repository by inspecting or throwing specific domain errors (`BookmarkNotFound` or `BookmarkAlreadyVisited`). |
| Header size explosion | Low | Use compact metric names (`auth`, `db`, `total`) and omit verbose descriptions, keeping `Server-Timing` headers under 120 bytes. |

## Rollback Plan
1. Revert UI components (`pending-checklist-view.tsx`, `bookmark-view-tabs.tsx`, `visited-history-view.tsx`) to standard loader props without `useFetchers()` filtering.
2. Revert `MarkBookmarkVisitedCommandHandler` to the sequential `findById` + `update` pattern.
3. Remove `Server-Timing` header generation from `dashboard.tsx`.

## Success Criteria
- [ ] Clicking a bookmark checkbox or title link immediately moves the item out of the reading list with **0ms perceived delay**.
- [ ] Tab counters (Reading List / Archive) update instantaneously upon user interaction.
- [ ] If a network or server error occurs during marking, the UI automatically rolls back and displays the item.
- [ ] Database mutation for `mark_visited` executes in **1 single SQL round-trip** to Turso.
- [ ] Loader and action responses include valid `Server-Timing` headers viewable in browser DevTools Network tab.
- [ ] 100% of unit and integration tests pass.
