# Design: Serverless Asynchronous Bookmark Pipeline (Vercel + Turso)

## Technical Approach
Decouple the URL submission from synchronous scraping and AI taxonomy inference. The route action performs an instantaneous (<30ms) insert into Turso with `status: "processing"`, registers the background enrichment task via Vercel's `waitUntil()`, and returns HTTP 200 immediately. 

In the background, the serverless function executes the scraping pipeline and Vercel AI SDK categorization before updating the Turso DB record to `status: "pending"`. On the frontend, `dashboard.tsx` renders a live "Processing Queue" and uses a dynamic `useRevalidator()` hook to poll every 2 seconds *only while active processing items exist*, automatically ceasing polling once all items transition to `pending`.

```
[ User Browser ]
       │
       │ 1. POST URL (Form submit)
       ▼
[ Route Action in dashboard.tsx ]
       │
       ├── 2. INSERT into Turso: { id, url, title: hostname, status: 'processing' }  (<20ms)
       │
       ├── 3. waitUntil(processBookmarkHandler.execute({ bookmarkId, url, userId }))
       │
       ▼ (Instant HTTP 200 response, <30ms)
[ User Browser ] ───► Displays optimistic "Processing..." card; starts 2s poll timer
       │
       │ (Background Serverless Execution via waitUntil)
       ▼
[ ProcessBookmarkHandler ]
       │
       ├── 4. metadataScraper.scrape(url) ──────────► [ HTML OpenGraph Metadata ]
       │
       ├── 5. categorizer.categorize(title, desc) ──► [ Vercel AI SDK (Gemini/OpenAI) ]
       │
       └── 6. UPDATE Turso DB SET status = 'pending', title, description, ogImage, category
              │
              ▼ (2s Poll Revalidation triggers loader in dashboard.tsx)
[ User Browser ] ───► Card smoothly moves from "Processing Queue" to categorized folder; stops polling
```

---

## Architecture Decisions

| Area | Decision | Alternatives Considered | Rationale |
|------|----------|-------------------------|-----------|
| **Background Execution** | Vercel `waitUntil()` | Restate, BullMQ/Redis, In-memory Node queue | Native to Vercel serverless functions, zero extra infrastructure, 100% free, prevents function freeze after HTTP response. |
| **Database** | Turso (libsql Cloud DB) | Local SQLite file | Turso provides serverless-compatible cloud SQLite accessible over HTTP with sub-10ms query latency. |
| **Frontend Sync** | Poll-on-Demand via `useRevalidator()` | WebSockets, Server-Sent Events (SSE) | SSE holds serverless function execution open on Vercel, hitting timeouts and burning compute. Poll-on-demand runs only while items are processing (~2-4s total) with 0 idle cost. |
| **Local Dev Compatibility** | `waitUntil` abstraction shim | Strict Vercel-only runtime | Allows `npm run dev` and `npm test` to run seamlessly without needing the Vercel CLI locally. |

---

## Data Flow

1. **Submit**: User submits URL → Route action validates URL, generates `bookmarkId = crypto.randomUUID()`, inserts row with `status: "processing"` into Turso, registers background task with `waitUntil`, and returns `{ success: true, bookmarkId }`.
2. **Background Enrichment**:
   - `metadataScraper.scrape(url)` fetches title, description, and OpenGraph image with an 8-second timeout.
   - `categorizer.categorize(...)` infers category and subcategory via Vercel AI SDK.
   - `bookmarkRepository.update(...)` updates the Turso record: `status: "pending"`, final `title`, `description`, `ogImage`, `category`, and `subcategory`.
3. **Frontend Revalidation**:
   - Dashboard loader queries all bookmarks (`pending`, `visited`, and `processing`).
   - If `processingCount > 0`, a `useEffect` interval triggers `revalidator.revalidate()` every 2000ms.
   - Once all processing bookmarks are finished, the interval cleans up and polling stops.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@vercel/functions` dependency |
| `src/shared/infrastructure/db/schema.ts` | Modify | Extend `bookmarksTable.status` enum with `'processing'` and `'failed'` |
| `src/modules/bookmark/domain/bookmark-status.ts` | Modify | Add `BookmarkStatus.PROCESSING` and `BookmarkStatus.FAILED` |
| `src/modules/bookmark/domain/bookmark.ts` | Modify | Add aggregate methods `createProcessing(...)` and `completeProcessing(...)` |
| `src/shared/infrastructure/async/wait-until.ts` | Create | Abstraction wrapping `@vercel/functions` `waitUntil` with local development fallback |
| `src/modules/bookmark/application/process-bookmark-handler.ts` | Create | Background command handler executing scraping, AI taxonomy, and DB persistence |
| `src/modules/bookmark/application/create-bookmark-command.ts` | Modify | Decouple into fast initial `processing` insert + background dispatch |
| `src/shared/infrastructure/container.ts` | Modify | Register `processBookmarkHandler` |
| `src/routes/dashboard.tsx` | Modify | Add Processing Queue UI section, optimistic card rendering, and poll-on-demand hook |
| `src/app.css` | Modify | Add styles for processing queue cards, pulse badges, and skeleton shimmer |

---

## Interfaces / Contracts

```ts
// src/shared/infrastructure/async/wait-until.ts
export function runBackground(promise: Promise<unknown>): void {
  try {
    // Dynamically require or invoke @vercel/functions waitUntil when available
    const { waitUntil } = require("@vercel/functions");
    if (typeof waitUntil === "function") {
      waitUntil(promise);
      return;
    }
  } catch {
    // Local development fallback: let promise run in Node event loop
    promise.catch((err) => console.error("[Background Task Error]:", err));
  }
}

// src/modules/bookmark/application/process-bookmark-handler.ts
export class ProcessBookmarkHandler {
  constructor(
    private readonly repository: BookmarkRepository,
    private readonly scraper: MetadataScraper,
    private readonly categorizer: BookmarkCategorizer
  ) {}

  async execute(input: { bookmarkId: string; url: string; userId: string }): Promise<void> {
    const bookmark = await this.repository.findById(input.bookmarkId);
    if (!bookmark) return;

    let scraped = { title: new URL(input.url).hostname, description: "", ogImage: undefined };
    try {
      scraped = await this.scraper.scrape(input.url);
    } catch (err) {
      console.warn(`[ProcessBookmark] Scraping fallback for ${input.url}:`, err);
    }

    let taxonomy = { category: "Uncategorized", subcategory: "General" };
    try {
      taxonomy = await this.categorizer.categorize(scraped.title, scraped.description, input.url);
    } catch (err) {
      console.warn(`[ProcessBookmark] Categorization fallback for ${input.url}:`, err);
    }

    const completed = bookmark.completeProcessing({
      title: scraped.title,
      description: scraped.description,
      ogImage: scraped.ogImage,
      category: taxonomy.category,
      subcategory: taxonomy.subcategory,
    });

    await this.repository.update(completed.toState());
  }
}
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit** | `Bookmark` domain aggregate transitions (`createProcessing`, `completeProcessing`) | Vitest unit tests verifying state invariants and timestamp updates |
| **Unit** | `ProcessBookmarkHandler` enrichment and fallback logic | Vitest unit tests with mocked scraper and categorizer |
| **Integration** | `CreateBookmarkHandler` + `runBackground` | Vitest test ensuring initial row is saved with `processing` and background task is dispatched |
| **Integration** | Dynamic poll-on-demand condition | Vitest test verifying revalidation triggers only when `processingItems.length > 0` |

---

## Migration & Rollout
1. Schema update: Run `npm run db:push` to apply schema updates (`status` column enum) to Turso.
2. Backwards compatibility: Existing rows with `status: "pending"` or `status: "visited"` are untouched.
3. Zero downtime deployment on Vercel.
