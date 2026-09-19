# Architecture & Design System

This document outlines the architectural patterns, bounded contexts, and engineering standards implemented in **Offload**.

---

## 1. Architectural Philosophy: Screaming & Hexagonal

Offload strictly adheres to **Screaming Architecture** (Clean Architecture) and **Hexagonal (Ports & Adapters)** principles. The folder structure highlights the business domain and capability boundaries rather than the underlying web framework:

```
src/
├── modules/                   # Bounded Contexts
│   ├── bookmark/              # Ingestion, extraction, checklists, status lifecycle
│   ├── categorization/        # AI-driven taxonomic taxonomy & classification
│   ├── auth/                  # Identity, tenant session, & security boundary
│   └── admin/                 # Migration tools & backoffice administration
├── shared/                    # Foundational domain primitives & cross-cutting infra
│   ├── domain/                # Result<T, E>, AppError hierarchy
│   ├── infrastructure/        # DB client, Better Auth instance, Server-Timing telemetry
│   └── ui/                    # UI components, layout shell
└── routes/                    # React Router v7 endpoints (Thin presentation controllers)
```

Each bounded context module maintains strict internal layer boundaries:
- **`domain/`**: Pure TypeScript. Entities, Value Objects, Domain Events, and Aggregate Deciders. Never imports from `application/`, `infrastructure/`, `routes/`, or external frameworks.
- **`application/`**: Use cases, Command and Query handlers. Expresses business workflows by orchestrating domain models and ports.
- **`infrastructure/`**: Implementation of secondary ports (database adapters, third-party APIs, LLMs, scrapers, telemetry decorators).
- **`ui/`**: Module-specific presentational components and interactive views.

---

## 2. Domain-Driven Design Patterns

### Aggregate Decider Pattern
State transitions for entities (such as bookmarks transitioning across pending, visited, or archived) are implemented as deterministic, pure decider functions that take the current state and a command/event, returning either a new state or a validation failure wrapped in a `Result` type.

### Result Pattern & Typed Errors
Rather than throwing unhandled runtime exceptions across boundaries, application services return typed `Result<T, AppError>` objects:
- `Result.ok(value)` for success paths.
- `Result.err(error)` for domain/validation errors with explicit error codes (`NotFoundError`, `UnauthorizedError`, `ConflictError`).

---

## 3. Multi-Tenant Isolation & Authentication

### Security Boundary
- Authentication is managed via **Better Auth** with GitHub and Google OAuth.
- Session tokens are validated in `src/shared/infrastructure/auth/auth.server.ts` and forwarded via React Router server loaders.
- Every bookmark query and mutation mandates a valid `user_id`. Tenant isolation is enforced at the database layer with foreign keys and index constraints (`bookmarks_user_id_idx`, `bookmarks_user_id_status_idx`).
- Cross-tenant data leakage is continuously tested via automated tenant isolation test suites.

---

## 4. Universal Persistence: LibSQL & Drizzle ORM

- **Driver**: `@libsql/client` (pure JavaScript driver).
- **Why LibSQL over native SQLite drivers (`better-sqlite3`)**:
  - `better-sqlite3` relies on native C++ compilation, which causes peer-dependency resolution failures and binary incompatibilities in serverless environments like AWS Lambda and Vercel.
  - `@libsql/client` connects seamlessly to local file databases (`file:sqlite.db`) during development and to remote Cloud Turso databases (`libsql://...`) in production with zero code changes.

---

## 5. Performance & Telemetry

### Server-Timing & Decorator Pattern
- Critical infrastructure operations (database queries, scraping pipelines, AI invocations) are wrapped using the **Decorator Pattern**.
- The `TelemetryBookmarkRepositoryDecorator` measures method execution duration and emits `Server-Timing` HTTP headers (`Server-Timing: db;dur=12.4`).
- Frontend applications inspect these headers or optimistic latency telemetry to ensure sub-100ms perceived performance.

---

## 6. AI Ingestion & Scraping Strategy

### Resilient Extraction Pipeline
1. Fetch URL with standard HTTP client and Cheerio parser.
2. Extract OpenGraph metadata (`og:title`, `og:description`, `og:image`).
3. Fallback to `<title>` tag, `<meta name="description">`, and semantic body text extraction if OG tags are missing.

### Categorization Strategy
- The categorization system uses the Strategy pattern via Vercel AI SDK:
  - **Google Gemini**: default cloud provider.
  - **OpenAI**: alternative cloud provider.
  - **Deterministic Heuristic Classifier**: local fallback when no API keys are configured.
