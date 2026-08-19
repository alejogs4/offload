# Tasks: Serverless Asynchronous Bookmark Pipeline (Vercel + Turso)

## Phase 1: Domain & Infrastructure Foundation

- [x] 1.1 Install `@vercel/functions` in [`package.json`](file:///Users/alejandrogarciaserna/Documents/github/offload/package.json)
- [x] 1.2 Update [`src/modules/bookmark/domain/bookmark-status.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/domain/bookmark-status.ts) and [`src/shared/infrastructure/db/schema.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/db/schema.ts) to include `PROCESSING = "processing"` and `FAILED = "failed"`
- [x] 1.3 Update [`src/modules/bookmark/domain/bookmark.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/domain/bookmark.ts) with `createProcessing(...)` and `completeProcessing(...)` aggregate methods
- [x] 1.4 Create [`src/shared/infrastructure/async/wait-until.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/async/wait-until.ts) wrapping `@vercel/functions` `waitUntil` with local development fallback

## Phase 2: Core Background Application Logic

- [x] 2.1 Create [`src/modules/bookmark/application/process-bookmark-handler.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/process-bookmark-handler.ts) orchestrating background scraping, AI categorization, and Turso persistence with graceful fallbacks
- [x] 2.2 Refactor [`src/modules/bookmark/application/create-bookmark-command.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/create-bookmark-command.ts) to insert initial `processing` bookmark in <20ms and dispatch `ProcessBookmarkHandler` via `runBackground`
- [x] 2.3 Register `processBookmarkHandler` and updated `createBookmarkHandler` in [`src/shared/infrastructure/container.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/shared/infrastructure/container.ts)

## Phase 3: Route & UI Implementation

- [x] 3.1 Update [`src/modules/bookmark/application/get-folder-tree-query.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/get-folder-tree-query.ts) to include `processingBookmarks` in the query result
- [x] 3.2 Update [`src/routes/dashboard.tsx`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/routes/dashboard.tsx) to render a live "Processing Queue" section, non-blocking form reset, and poll-on-demand `useRevalidator` hook active only when `processingCount > 0`
- [x] 3.3 Update [`src/app.css`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/app.css) with processing queue card styles, pulse animation, and skeleton shimmer

## Phase 4: Testing & Verification

- [x] 4.1 Update domain unit tests in [`src/modules/bookmark/domain/__tests__/bookmark.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/domain/__tests__/bookmark.test.ts) to verify `PROCESSING` transitions
- [x] 4.2 Create unit tests in [`src/modules/bookmark/application/__tests__/process-bookmark-handler.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/__tests__/process-bookmark-handler.test.ts) testing background enrichment and fallback paths
- [x] 4.3 Update [`src/modules/bookmark/application/__tests__/create-bookmark-command.test.ts`](file:///Users/alejandrogarciaserna/Documents/github/offload/src/modules/bookmark/application/__tests__/create-bookmark-command.test.ts) and run test suite `npm test`
