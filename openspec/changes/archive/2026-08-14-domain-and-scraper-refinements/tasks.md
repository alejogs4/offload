# Tasks: Domain Modeling Refinements, Zod Boundaries & Scraper Strategy Architecture

## Phase 1: Domain Layer & Core Types
- [x] 1.1 Update `src/shared/domain/base-entity.ts` to generic `BaseEntity<TState, TEvent>` with `protected abstract evolve(state: TState | null, event: TEvent): TState` and `public transition(state: TState | null, event: TEvent): TState`.
- [x] 1.2 Create `src/modules/bookmark/domain/bookmark-schema.ts` defining Zod schemas for all Value Objects (`BookmarkIdSchema`, `UserIdSchema`, `UrlSchema`, `BookmarkStatusSchema`, etc.) and `BookmarkStateSchema`.
- [x] 1.3 Update `src/modules/bookmark/domain/bookmark-events.ts` to define the `BookmarkEvent` Sum Type (discriminated union) and domain event contracts.
- [x] 1.4 Refactor `src/modules/bookmark/domain/bookmark.ts` to extend `BaseEntity<BookmarkState, BookmarkEvent>`, implement invariant checking methods (`create`, `markAsVisited`, `categorize`), and implement the `protected evolve()` reducer.
- [x] 1.5 Update domain tests in `src/modules/bookmark/domain/__tests__/bookmark.test.ts` to verify invariant checks, error throwing on unauthorized/invalid states, and pure state transitions.

## Phase 2: Metadata Scraper Strategy & Factory
- [x] 2.1 Create extraction context and strategy interface in `src/modules/bookmark/infrastructure/scraper/metadata-extractor-strategy.ts`.
- [x] 2.2 Implement concrete strategies under `src/modules/bookmark/infrastructure/scraper/strategies/`:
  - `oembed-strategy.ts` (YouTube / video oEmbed API extraction)
  - `json-ld-strategy.ts` (schema.org JSON-LD extraction)
  - `opengraph-strategy.ts` (OG & Twitter card meta extraction)
  - `html-fallback-strategy.ts` (`<title>`, `<h1>`, `<p>` tags)
  - `domain-fallback-strategy.ts` (Hostname heuristics & failure fallbacks)
- [x] 2.3 Implement `src/modules/bookmark/infrastructure/scraper/pipeline-metadata-scraper.ts` to coordinate and merge strategy results.
- [x] 2.4 Implement `src/modules/bookmark/infrastructure/scraper/metadata-scraper-factory.ts` to configure and instantiate the pipeline.
- [x] 2.5 Add comprehensive unit tests in `src/modules/bookmark/infrastructure/scraper/__tests__/scraper.test.ts` validating strategy isolation, pipeline merging, and fallback behaviors.

## Phase 3: Infrastructure & Repository Zod Hydration
- [x] 3.1 Update `src/modules/bookmark/domain/bookmark-repository-port.ts` interface to accept and return `BookmarkState`.
- [x] 3.2 Refactor `src/modules/bookmark/infrastructure/drizzle-bookmark-repository.ts` to parse rows through `BookmarkStateSchema.parse(row)` on query and validate inputs on save/update.
- [x] 3.3 Update `src/shared/infrastructure/container.ts` to wire the new `MetadataScraperFactory` scraper and repository instances.

## Phase 4: Application Handlers & Edge Validation
- [x] 4.1 Refactor `src/modules/bookmark/application/create-bookmark-command.ts` to use `Bookmark` aggregate `create()`, evolve state, save to repository, and publish events.
- [x] 4.2 Refactor `src/modules/bookmark/application/mark-bookmark-visited-command.ts` to use `Bookmark` aggregate `markAsVisited()`, evolve state, update repository, and publish events.
- [x] 4.3 Update `src/modules/categorization/application/categorize-bookmark-handler.ts` and `get-folder-tree-query.ts` to interact with `BookmarkState`.
- [x] 4.4 Update `src/routes/dashboard.tsx` action to validate incoming requests with Zod schemas.

## Phase 5: Verification & Full Test Suite
- [x] 5.1 Run `npm test` (`npx vitest run`) and ensure 100% of tests pass across all test suites.
- [x] 5.2 Validate TypeScript compilation (`npx tsc --noEmit`) to ensure zero type errors across the entire codebase.
