# Proposal: Domain Modeling Refinements, Zod Boundaries & Scraper Strategy Architecture

## Intent
Refactor domain modeling and infrastructure components to enforce functional Domain-Driven Design (DDD) principles with Zod schemas as the single source of truth, encapsulate state transitions via a protected `evolve` method on `BaseEntity` pattern matching over event sum types, validate and decode at I/O boundaries, and decompose the metadata scraper into an extensible Strategy + Pipeline + Factory architecture.

## Scope

### In Scope
- **Zod Value Objects & State Schema**: Define Zod schemas and inferred types for all Value Objects (`BookmarkId`, `UserId`, `Url`, `BookmarkStatus`, etc.) and `BookmarkState`.
- **`BaseEntity<TState, TEvent>` Contract**: Provide a base entity with a `protected abstract evolve(state: TState | null, event: TEvent): TState` contract and public `transition` method.
- **Aggregate Decider & Sum Type**: Implement `Bookmark` aggregate producing a discriminated union (`BookmarkEvent`) upon invariant verification and evolving state internally through `evolve`.
- **Boundary Decoding with Zod**:
  - Repositories decode database rows via `BookmarkStateSchema.parse(row)`.
  - Edge Route Actions validate inputs using Zod input schemas.
- **Scraper Strategy & Factory Pattern**:
  - Decompose `CheerioMetadataScraper` into dedicated strategy extractors: `OEmbedStrategy`, `JsonLdStrategy`, `OpenGraphStrategy`, `HtmlFallbackStrategy`, and `DomainFallbackStrategy`.
  - Implement a `PipelineMetadataScraper` (Composite/Chain) to merge metadata sequentially.
  - Implement `MetadataScraperFactory` to assemble scrapers with configurable strategies and timeouts.
- **Test Suite Updates**: Update unit and integration tests to validate aggregate invariant checks, sum-type state transitions, boundary Zod parsing, and scraper strategies.

### Out of Scope
- Changing UI layout or visual styling.
- Changing database table schema in SQLite (Drizzle schema column names stay compatible).
- Altering external AI categorization logic (categorization adapter remains intact, consuming new domain state types).

## Capabilities

### New Capabilities
- `domain-zod-schemas`: Single source of truth for domain primitives, state, and runtime validation.
- `functional-aggregate-decider`: Stateless aggregate invariant checker with sum-type event transitions and protected `evolve` reducer.
- `scraper-strategy-pipeline`: Pluggable metadata extraction strategies orchestrated by a pipeline and factory.

### Modified Capabilities
- `bookmark-repository`: Hydrates and persists pure `BookmarkState` validated through Zod.
- `bookmark-commands`: Command handlers orchestrate Decider → State Evolution → Repository Persistence → Event Bus dispatch.

## Approach

### 1. Domain Layer (`src/modules/bookmark/domain/`)
- `BaseEntity<TState, TEvent>` in `src/shared/domain/base-entity.ts` defining `protected abstract evolve(state: TState | null, event: TEvent): TState` and `public transition(state: TState | null, event: TEvent): TState`.
- `BookmarkStateSchema` & Value Objects in `src/modules/bookmark/domain/bookmark-schema.ts`.
- `BookmarkEvent` sum type and `Bookmark` aggregate class in `src/modules/bookmark/domain/bookmark.ts`.

### 2. Application Layer (`src/modules/bookmark/application/`)
- `CreateBookmarkCommandHandler` and `MarkBookmarkVisitedCommandHandler` refactored to execute invariant checks on the aggregate, transition state via `evolve`, persist the evolved state to the repository, and dispatch events.

### 3. Infrastructure Layer (`src/modules/bookmark/infrastructure/`)
- `DrizzleBookmarkRepository` uses `BookmarkStateSchema.parse(row)` when fetching and persists `BookmarkState`.
- Scraper refactoring into:
  - `src/modules/bookmark/infrastructure/scraper/strategies/` (OEmbed, JsonLd, OpenGraph, HtmlFallback, DomainFallback).
  - `src/modules/bookmark/infrastructure/scraper/pipeline-metadata-scraper.ts`.
  - `src/modules/bookmark/infrastructure/scraper/metadata-scraper-factory.ts`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/domain/base-entity.ts` | Modified | Add generic `<TState, TEvent>` with protected `evolve()` contract |
| `src/modules/bookmark/domain/` | Modified | Introduce Zod schemas, sum type events, and refactor `Bookmark` aggregate |
| `src/modules/bookmark/application/` | Modified | Update command handlers to use aggregate decider + evolve flow |
| `src/modules/bookmark/infrastructure/` | Modified | Update repository Zod decoding and decompose scraper into strategies |
| `src/routes/dashboard.tsx` | Modified | Validate edge inputs with Zod schemas |
| `src/modules/bookmark/**/__tests__/` | Modified | Refactor and expand unit tests for new patterns |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Database null/legacy values failing Zod parsing | Low | Provide sensible defaults in Zod schemas (e.g. `description.default("")`) matching SQLite schema |
| Performance overhead in strategy iteration | Low | Parse Cheerio DOM once in shared `ExtractionContext` and pass to DOM-based strategies |

## Rollback Plan
- Revert Git commit back to main branch prior to change application.

## Success Criteria
- [ ] Domain state & value objects are defined and validated by Zod schemas.
- [ ] `BaseEntity` provides protected `evolve()` implemented by `Bookmark` pattern matching on `BookmarkEvent` sum type.
- [ ] Repositories decode rows via `BookmarkStateSchema.parse()` without untyped casting.
- [ ] Metadata scraper uses Strategy + Pipeline + Factory patterns with 100% test coverage for individual strategies.
- [ ] All Vitest tests pass cleanly.
