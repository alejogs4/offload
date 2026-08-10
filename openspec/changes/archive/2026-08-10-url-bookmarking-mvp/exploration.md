# Exploration: URL Bookmarking & Auto-Categorization MVP

## Overview
A web platform designed to save, automatically categorize, group, and track reading progress for web links via a checklist workflow.

---

## 1. Stack & Architectural Blueprint

### Core Stack
- **Framework**: Remix / React Router (v7)
- **Database**: SQLite (via `drizzle-orm` + `better-sqlite3` or `libsql`)
- **UI & Styling**: React 19 + Vanilla CSS / CSS Modules
- **AI Integration**: Vercel AI SDK (`ai` + Zod for structured categorization schemas)

### Architectural Paradigm: Hexagonal Architecture + CQRS + Domain Events

```
                      ┌──────────────────────────────────────────────┐
                      │              Remix / React Router            │
                      └──────────────┬────────────────┬──────────────┘
                                     │                │
                        (Loaders)    │                │    (Actions)
                        Query Bus    │                │   Command Bus
                            │        ▼                ▼        │
                            │  ┌──────────┐      ┌──────────┐  │
                            └─►│  Query   │      │ Command  │◄─┘
                               └────┬─────┘      └────┬─────┘
                                    │                 │
                                    │                 ▼
                                    │         ┌───────────────┐
                                    │         │ Domain Entity │
                                    │         └───────┬───────┘
                                    │                 │
                                    │                 ▼
                                    │          Domain Events (EventBus)
                                    │                 │
                                    ▼                 ▼
                        ┌────────────────────────────────────────────┐
                        │              Ports & Adapters              │
                        ├──────────────────────┬─────────────────────┤
                        │ Drizzle DB Adapter   │ AI Categorizer Port │
                        └──────────────────────┴─────────────────────┘
```

---

## 2. Hexagonal Boundary Structure

- `src/domain/`
  - **Entities & Value Objects**: `Bookmark`, `Category`, `BookmarkId`, `BookmarkStatus` (`pending` | `visited`).
  - **Domain Events**: `BookmarkCreatedEvent`, `BookmarkCategorizedEvent`, `BookmarkVisitedEvent`.
  - **Repository & Port Interfaces**: `BookmarkRepository`, `MetadataScraperPort`, `CategorizerPort`, `EventBusPort`.

- `src/application/`
  - **Commands (Writes)**: `CreateBookmarkCommand`, `MarkBookmarkVisitedCommand`, `CategorizeBookmarkCommand`.
  - **Queries (Reads)**: `GetFolderTreeQuery`, `GetChecklistBookmarksQuery`.
  - **Event Handlers**: Listen to `BookmarkCreatedEvent` -> Trigger `CategorizeBookmarkCommand`.

- `src/infrastructure/`
  - **Scraper Adapter**: `HttpMetadataScraper` (fetches OpenGraph tags using `cheerio`).
  - **AI Categorizer Adapter**: `VercelAiCategorizer` (uses Vercel AI SDK `generateObject` with Zod schema for type-safe category/subcategory inference).
  - **Persistence Adapter**: `DrizzleBookmarkRepository` (SQLite).
  - **Event Bus Adapter**: `InMemoryEventBus` (decoupled sync event dispatcher).

- `src/presentation/` (Remix/React Router)
  - **Loaders**: Instantiate and execute **Queries** to render views.
  - **Actions**: Parse form data/JSON, execute **Commands**, and return response or trigger revalidation.

---

## 3. Recommended AI / LLM Tooling Choice

**Selected Tool**: **Vercel AI SDK (`ai` + `@ai-sdk/google` / `@ai-sdk/openai`)**

### Why Vercel AI SDK fits Hexagonal Architecture:
1. **Provider Agnostic**: Port interface `CategorizerPort` receives any provider model instance (`google('gemini-2.5-flash')`, `openai('gpt-4o-mini')`, etc.) without touching application logic.
2. **Type-Safe Structured Output**: Native support for `generateObject()` with Zod schemas guarantees JSON response matching category/subcategory types:
   ```typescript
   const categorySchema = z.object({
     category: z.string(),
     subcategory: z.string(),
     tags: z.array(z.string()),
   });
   ```
3. **Lightweight & Modular**: Zero bloated abstractions compared to LangChain.

---

## 4. Risks & Mitigation
- **In-Memory Event Bus Scope**: In-process event handling during serverless/short-lived processes.
  - *Mitigation*: Ensure event bus is cleanly abstraction-wrapped behind `EventBusPort` so it can be swapped for background queues (e.g. BullMQ / Redis / SQLite job queue) if needed.
- **LLM Rate Limits / Failures**: API downtime or timeout.
  - *Mitigation*: Scraper falls back to default `Uncategorized` category if AI fails, emitting `BookmarkCategorizationFailedEvent`.

---

## 5. Ready for Proposal
**Yes** — Architecture, CQRS flow, domain events, and stack are defined. Ready for `/sdd-propose url-bookmarking-mvp`.
