# Design: URL Bookmarking & Auto-Categorization MVP

## Technical Approach
Implement a decoupled, Hexagonal CQRS architecture in Remix / React Router (v7) backed by SQLite (`drizzle-orm` + `better-sqlite3`). 

- **Read Path (CQRS Queries)**: Route Loaders execute read Queries that fetch optimized projections directly from SQLite without invoking domain business logic.
- **Write Path (CQRS Commands)**: Route Actions execute Commands that enforce domain invariants and publish Domain Events to an in-process Event Bus.
- **AI Categorization**: Subscribed handler receives `BookmarkCreatedEvent` and calls `CategorizerPort` implemented via Vercel AI SDK (`generateObject`).
- **Passcode Auth**: Middleware/loader check inspecting an `HTTPOnly` cookie against `APP_PASSWORD`.

---

## Architecture Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|--------------------------|-----------|
| **Framework** | Remix / React Router v7 | Next.js, Express + Vite | Native Loader/Action split mirrors CQRS Query/Command pattern cleanly. |
| **ORM & DB** | Drizzle ORM + SQLite | Prisma, TypeORM | Light memory footprint, zero-config local file DB, raw SQL speed for query DTOs. |
| **AI SDK** | Vercel AI SDK (`ai`) | LangChain, `@google/genai` | Native Zod schema validation (`generateObject`), zero framework bloat, swappable providers. |
| **Event Bus** | In-Process Sync `EventBus` | Redis / BullMQ | Zero external infrastructure for MVP; swappable via `EventBusPort`. |
| **Auth** | `APP_PASSWORD` + Session Cookie | Clerk, Auth0, Remix-Auth | 100% private single-user deployment with 0 database/service dependencies. |

---

## Data Flow

```
[User Paste URL] ──> Remix Action ──> CreateBookmarkCommand ──> BookmarkRepository.save()
                                                                       │
                                                                       ▼
[Folder Tree View] <── Remix Loader <── GetFolderTreeQuery   <── Emit BookmarkCreatedEvent
                                                                       │
                                                                       ▼
                                                              EventBus.publish()
                                                                       │
                                                                       ▼
                                                          CategorizeBookmarkHandler
                                                                       │
                                                                       ▼
                                                          VercelAiCategorizerAdapter
```

---

## File Structure & Module Partitioning (Screaming Architecture / Package-by-Feature)

Rather than top-level technical layers (`src/domain`, `src/infrastructure`), code is vertically partitioned by **Domain / Feature Module**. Inside each module, clean Hexagonal boundaries (`domain`, `application`, `infrastructure`) are maintained:

```
src/
├── modules/
│   ├── auth/                      # Passcode Auth Module
│   │   ├── domain/                # Auth Session types
│   │   ├── application/           # VerifyPasscodeCommand, LogoutCommand
│   │   └── presentation/          # Login route handlers
│   │
│   ├── bookmark/                  # Core Bookmark Management Module
│   │   ├── domain/                # Bookmark entity, BookmarkStatus, BookmarkEvents
│   │   ├── application/           # CreateBookmarkCommand, MarkVisitedCommand, GetChecklistQuery
│   │   └── infrastructure/        # DrizzleBookmarkRepository, CheerioScraper
│   │
│   └── categorization/            # AI Taxonomy Categorization Module
│       ├── domain/                # Category, Subcategory value objects, CategorizerPort
│       ├── application/           # CategorizeBookmarkHandler, GetFolderTreeQuery
│       └── infrastructure/        # VercelAiCategorizerAdapter
│
├── shared/                        # Cross-cutting primitives
│   ├── domain/                    # EventBusPort, BaseEntity, DomainEvent
│   ├── infrastructure/            # Drizzle DB client, InMemoryEventBus implementation
│   └── ui/                        # Shared UI components & styles
│
└── routes/                        # Remix / React Router routes (Driving Adapters)
    ├── _auth.login.tsx
    ├── _app.tsx
    └── _app._index.tsx
```

| File Path | Action | Description |
|-----------|--------|-------------|
| `src/modules/auth/` | Create | Passcode verification logic & session cookie guard |
| `src/modules/bookmark/` | Create | Bookmark entity, ingestion commands, checklist queries, scraper adapter |
| `src/modules/categorization/` | Create | Taxonomy value objects, AI categorizer adapter, folder tree queries |
| `src/shared/infrastructure/` | Create | Shared SQLite Drizzle client & InMemoryEventBus |
| `src/routes/` | Create | Remix route actions & loaders connecting HTTP to application commands/queries |

---

## Core Interfaces & Type Contracts

```typescript
// Domain Event Contract
export interface DomainEvent<T = unknown> {
  eventId: string;
  occurredAt: Date;
  payload: T;
}

// Ports
export interface CategorizerPort {
  categorize(title: string, description: string, url: string): Promise<{ category: string; subcategory: string }>;
}

export interface MetadataScraperPort {
  scrape(url: string): Promise<{ title: string; description: string; ogImage?: string }>;
}

// Command & Query Interfaces
export interface CreateBookmarkInput {
  userId: string;
  url: string;
}

export interface BookmarkFolderDTO {
  category: string;
  subcategory: string;
  bookmarks: Array<{ id: string; title: string; url: string; status: 'pending' | 'visited' }>;
}
```

---

## Testing Strategy

Focus on high-speed, reliable **Unit & Integration testing** using Vitest. E2E browser testing is deferred post-MVP.

| Layer | Target | Approach | Tooling |
|-------|--------|----------|---------|
| **Unit** | Domain Entities, Value Objects & Use Cases | Test Commands, Queries, and Domain Event triggers using in-memory mock repositories/adapters | Vitest |
| **Integration** | Infrastructure Adapters & DB | Test Drizzle SQLite queries, Cheerio URL scraper, and Vercel AI SDK mock integration against real memory DB | Vitest + `better-sqlite3` (in-memory) |
| **E2E** | Full Browser UI | *Deferred post-MVP* | — |

---

## Migration / Rollout
No database migration required (fresh SQLite database). Initial schema applied via `drizzle-kit push`.

---

## Open Questions
- None.
