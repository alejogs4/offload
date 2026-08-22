# Tasks: Latency Telemetry and Optimistic UI (Vercel + Turso)

## Phase 1: Telemetry & Timing Infrastructure (Decorator Pattern)

- [x] 1.1 Create [`src/shared/infrastructure/telemetry/server-timing.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/telemetry/server-timing.ts) implementing `ServerTiming`, `serverTimingStorage` (`AsyncLocalStorage`), and `withServerTiming` helper with W3C `toHeader()` string formatting
- [x] 1.2 Create [`src/modules/bookmark/infrastructure/telemetry-bookmark-repository-decorator.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/infrastructure/telemetry-bookmark-repository-decorator.ts) implementing `BookmarkRepositoryPort` to transparently intercept and measure all DB repository methods
- [x] 1.3 Wire `TelemetryBookmarkRepositoryDecorator` in [`src/shared/infrastructure/container.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/container.ts) so application handlers and queries receive automatic telemetry without code changes
- [x] 1.4 Create unit tests in [`src/shared/infrastructure/telemetry/__tests__/server-timing.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/telemetry/__tests__/server-timing.test.ts) and [`src/modules/bookmark/infrastructure/__tests__/telemetry-bookmark-repository-decorator.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/infrastructure/__tests__/telemetry-bookmark-repository-decorator.test.ts)
- [x] 1.5 Integrate `withServerTiming` into `loader` and `action` in [`src/routes/dashboard.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/dashboard.tsx) to attach `Server-Timing` headers to responses

## Phase 2: Repository & Handler Atomic Optimization

- [x] 2.1 Update [`src/modules/bookmark/domain/bookmark-repository-port.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/domain/bookmark-repository-port.ts) to declare atomic `markAsVisited(id: string, userId: string): Promise<BookmarkState>`
- [x] 2.2 Implement atomic `UPDATE bookmarks ... RETURNING *` in [`src/modules/bookmark/infrastructure/drizzle-bookmark-repository.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/infrastructure/drizzle-bookmark-repository.ts)
- [x] 2.3 Refactor [`src/modules/bookmark/application/mark-bookmark-visited-command.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/mark-bookmark-visited-command.ts) to execute single-query atomic update and publish `BookmarkVisitedEvent`
- [x] 2.4 Create unit tests in [`src/modules/bookmark/application/__tests__/mark-bookmark-visited-command.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/__tests__/mark-bookmark-visited-command.test.ts) validating atomic execution and event propagation

## Phase 3: React Router v7 Optimistic UI

- [x] 3.1 Create `useInFlightVisitedIds` hook or selector in [`src/modules/bookmark/ui/pending-checklist-view.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/ui/pending-checklist-view.tsx) leveraging `useFetchers()`
- [x] 3.2 Update [`src/modules/bookmark/ui/pending-checklist-view.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/ui/pending-checklist-view.tsx) to filter out in-flight marked bookmarks, recalculate category counts, and prune empty folders instantaneously
- [x] 3.3 Update [`src/routes/dashboard.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/dashboard.tsx) and [`src/modules/bookmark/ui/bookmark-view-tabs.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/ui/bookmark-view-tabs.tsx) to compute and display optimistic pending and visited badge counts
- [x] 3.4 Ensure WCAG 2.1 AA 44x44px touch targets and smooth interactive hover/active states for checkbox and link actions in [`src/app.css`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/app.css)

## Phase 4: Testing & Verification

- [x] 4.1 Run test suite `npm test` across domain, application, and infrastructure layers to verify zero regressions
- [x] 4.2 Validate optimistic UI behavior and graceful error rollback under simulated slow network conditions
- [x] 4.3 Verify `Server-Timing` headers in HTTP response using test requests or mock loaders
