# Tasks: URL Bookmarking & Auto-Categorization MVP

## Phase 1: Foundation & Shared Infrastructure

- [x] 1.1 Initialize project dependencies (`react-router`, `@remix-run/node`, `drizzle-orm`, `better-sqlite3`, `ai`, `@ai-sdk/google`, `cheerio`, `vitest`, `zod`).
- [x] 1.2 Setup `src/shared/domain/` primitives: `BaseEntity`, `DomainEvent`, and `EventBusPort` interface.
- [x] 1.3 Create `src/shared/infrastructure/events/in-memory-event-bus.ts` implementing `EventBusPort`.
- [x] 1.4 Setup Drizzle SQLite connection and schema migrations in `src/shared/infrastructure/db/`.

## Phase 2: Feature Modules (Domain & Application Logic)

- [x] 2.1 Build `src/modules/auth/`: Passcode cookie session helper and `VerifyPasscodeCommand`.
- [x] 2.2 Build `src/modules/bookmark/domain/`: `Bookmark` entity, `BookmarkStatus` enum, and `BookmarkCreatedEvent`.
- [x] 2.3 Build `src/modules/bookmark/infrastructure/`: `DrizzleBookmarkRepository` and `CheerioMetadataScraper`.
- [x] 2.4 Build `src/modules/bookmark/application/`: `CreateBookmarkCommand` and `MarkBookmarkVisitedCommand`.
- [x] 2.5 Build `src/modules/categorization/domain/`: `Category` value object and `CategorizerPort`.
- [x] 2.6 Build `src/modules/categorization/infrastructure/`: `VercelAiCategorizerAdapter` using Vercel AI SDK `generateObject`.
- [x] 2.7 Build `src/modules/categorization/application/`: `CategorizeBookmarkHandler` and `GetFolderTreeQuery`.

## Phase 3: Presentation & Driving Adapters (Remix Routes)

- [x] 3.1 Implement `src/routes/login.tsx` for passcode entry and HTTPOnly session cookie creation.
- [x] 3.2 Implement authenticated layout guard checking session passcode cookie.
- [x] 3.3 Implement `src/routes/dashboard.tsx` Loader (executing `GetFolderTreeQuery`) and Actions (executing `CreateBookmarkCommand` / `MarkBookmarkVisitedCommand`).
- [x] 3.4 Create UI components: `BookmarkInputBar`, `FolderTreeAccordion`, and `ChecklistItem` in `src/app.css` dark mode styling.

## Phase 4: Unit & Integration Testing (Vitest)

- [x] 4.1 Unit test `Bookmark` entity invariants and `CreateBookmarkCommand` in `src/modules/bookmark/domain/__tests__/`.
- [x] 4.2 Integration test `DrizzleBookmarkRepository` using in-memory SQLite (`:memory:`) in `src/modules/bookmark/infrastructure/__tests__/`.
- [x] 4.3 Unit test `CategorizeBookmarkHandler` using mock `CategorizerPort` in `src/modules/categorization/application/__tests__/`.
- [x] 4.4 Integration test Passcode session authentication helper in `src/modules/auth/__tests__/`.
