# Proposal: Serverless Asynchronous Bookmark Pipeline (Vercel + Turso)

## Intent
Eliminate the synchronous 2–8 second bookmark creation latency by moving scraping and AI categorization to background execution using Vercel's native `waitUntil()` and Turso Cloud database. This gives users immediate (<30ms) non-blocking URL submissions, concurrent inputs, and live processing visual feedback without extra infrastructure.

## Scope

### In Scope
- Non-blocking URL submission action in React Router generating UUIDs and persisting `processing` records immediately.
- Background asynchronous processor executing scraping and AI categorization within `waitUntil()`.
- Local development fallback for `waitUntil` when running outside Vercel.
- Database schema and domain model extensions for `status: 'processing' | 'pending' | 'visited' | 'failed'`.
- "Processing Queue" UI section in `dashboard.tsx` with animated progress states.
- Poll-on-demand revalidation in the frontend active only while processing items exist.

### Out of Scope
- External workflow engines (Restate, Temporal, BullMQ, Redis) — rejected as over-engineering for Vercel + Turso.
- WebSockets or persistent SSE streams — unnecessary on serverless; replaced with smart poll-on-demand.

## Capabilities

### New Capabilities
- `async-bookmark-processing`: Background execution of scraping and AI categorization using `waitUntil()` and Turso.
- `optimistic-revalidation`: Dynamic poll-on-demand UI revalidation active only when items are in `processing` state.

### Modified Capabilities
- `bookmark-ingestion`: Ingestion decoupled into immediate `processing` creation and asynchronous background enrichment.

## Approach
1. **Action Ingress**: When a user submits a URL, the dashboard route action inserts an initial bookmark row into Turso with `status: "processing"` and title set to the domain hostname.
2. **Background Dispatch**: The action registers the enrichment promise with `waitUntil(processBookmarkAsync(bookmarkId))` and returns HTTP 200 immediately (<30ms).
3. **Enrichment**: The background task scrapes metadata and infers taxonomy via Vercel AI SDK, updating the Turso DB row to `status: "pending"`.
4. **UI Updates**: `dashboard.tsx` displays optimistic processing cards. A `useRevalidator` hook triggers every 2 seconds while any bookmark has `status === 'processing'`, seamlessly transitioning finished cards into their categorized folders.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add `@vercel/functions` (or native `waitUntil` integration) |
| `src/shared/infrastructure/db/schema.ts` | Modified | Add `processing` and `failed` to `bookmarksTable.status` |
| `src/modules/bookmark/domain/bookmark-status.ts` | Modified | Add `BookmarkStatus.PROCESSING` and `BookmarkStatus.FAILED` |
| `src/modules/bookmark/domain/bookmark.ts` | Modified | Add transitions for `createProcessing(...)` and `completeProcessing(...)` |
| `src/modules/bookmark/application/process-bookmark-handler.ts` | New | Application handler orchestrating background scrape & AI categorization |
| `src/shared/infrastructure/async/wait-until.ts` | New | Utility helper providing `waitUntil` with local development fallback |
| `src/routes/dashboard.tsx` | Modified | Non-blocking submit, processing queue cards, poll-on-demand hook |
| `src/app.css` | Modified | Modern skeleton shimmers and processing card animations |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Vercel function timeout on slow websites | Low | Use 8-second `AbortSignal.timeout()` on scrape and AI calls |
| Polling overhead | Low | Polling only runs while `processingCount > 0`, immediately stops when queue is empty |
| Local dev divergence | Low | Shim `waitUntil` using standard unhandled promise tracking in development |

## Rollback Plan
Revert route action in `src/routes/dashboard.tsx` to invoke synchronous `createBookmarkHandler` and restore the original `status: 'pending'` default.

## Dependencies
- `@vercel/functions` (^1.4.0)

## Success Criteria
- [ ] URL submissions respond in `< 50ms` regardless of website scraping or AI response time.
- [ ] Users can paste multiple URLs back-to-back without waiting for previous ones to finish.
- [ ] Processing items display live skeleton cards and transition into categorized folders within 2–5 seconds.
- [ ] Zero additional paid services, containers, or daemons required for deployment.
