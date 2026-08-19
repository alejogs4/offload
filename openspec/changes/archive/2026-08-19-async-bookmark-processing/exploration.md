# Exploration: Serverless Asynchronous Bookmark Pipeline (Vercel + Turso)

## Context & Current State
- **Synchronous Pipeline in Route Action**: In `src/routes/dashboard.tsx`, submitting a URL invokes `createBookmarkHandler.execute(...)` synchronously on the HTTP request thread.
- **High Latency & Blocking UI**: Scraping via Cheerio (500ms–3s) plus LLM categorization via Vercel AI SDK (1–4s) locks the route action for **2s to 8s**, preventing users from batch-submitting or pasting multiple URLs rapidly.
- **Deployment Constraints**:
  - The project is deployed to **Vercel (Serverless)** with **Turso (Cloud LibSQL)** as documented in `src/shared/infrastructure/db/client.ts` and `guides/deployment.md`.
  - Serverless functions freeze immediately once an HTTP response is returned unless extended via `waitUntil()`.
  - Long-lived Server-Sent Events (SSE) connections hold serverless function execution and hit Vercel execution timeouts (10s–60s).

---

## Architectural Comparison

| Approach | Extra Services | Deployment Complexity | Serverless Suitability | Cost | Verdict |
|---|---|---|---|---|---|
| **Approach 1: Vercel `waitUntil()` + Turso + Poll-on-Demand** | **None (0)** | **Lowest** (native to Vercel & React Router) | **Native** (designed for serverless background tasks) | Free | **Recommended** |
| **Approach 2: Restate Workflow Engine** | 1 (Restate Cloud / daemon) | High (requires separate service + webhook routing) | Moderate (overhead for simple 3-step pipeline) | Free tier | Overkill |
| **Approach 3: Upstash QStash / Inngest** | 1 (Queue provider) | Medium (API keys, webhook endpoints) | Good (external HTTP retry queue) | Free tier | Unnecessary unless jobs exceed 60s |
| **Approach 4: In-Memory Node Queue (`p-queue`)** | None | Low | **Fails** (Vercel freezes process after response) | Free | Incompatible |

---

## Recommended Architecture: Vercel `waitUntil` + Turso

### Ingress & Background Dispatch
1. **Immediate Acknowledgment (<30ms)**:
   - User submits URL.
   - Action inserts placeholder into Turso: `{ id, url, title: hostname, status: 'processing', userId, createdAt, updatedAt }`.
   - Action triggers `waitUntil(processBookmarkAsync({ bookmarkId, url, userId }))`.
   - Returns instant HTTP 200 `{ success: true, bookmarkId }`.

2. **Background Execution (`waitUntil`)**:
   - `metadataScraper.scrape(url)` extracts title, description, OpenGraph image.
   - `categorizer.categorize(title, description, url)` calls Vercel AI SDK.
   - Updates Turso DB record: `status: 'pending'`, `title`, `description`, `ogImage`, `category`, `subcategory`.
   - If scraping or AI fails, gracefully updates record to `status: 'pending'` with fallback category ("Uncategorized") or `status: 'failed'`.

3. **Frontend UX (Optimistic & Poll-on-Demand)**:
   - Dashboard renders an active "Processing Queue" section with animated skeleton shimmer cards.
   - Uses a lightweight polling hook (`useRevalidator()` every 2s) **only while there are active items in `processing` status**.
   - As soon as all items reach `pending`, polling stops automatically. Zero persistent SSE connections or idle function costs.

---

## Risks & Mitigations
1. **Vercel Function Timeout (Hobby: 10-15s, Pro: 60s)**:
   - *Mitigation*: Scraping and LLM calls run in ~2–4s with explicit 8s `AbortSignal.timeout()`.
2. **Database Concurrency on Turso**:
   - *Mitigation*: LibSQL handles HTTP-based remote transactions cleanly with connection pooling.
3. **Local Dev Compatibility**:
   - *Mitigation*: Provide a polyfill/shim for `waitUntil` when running locally via `react-router-serve` or Vite dev server.

---

## Ready for Proposal
**Yes**. The architecture is aligned with the project's Vercel + Turso stack, requires zero extra infrastructure, and delivers an instant user experience.
