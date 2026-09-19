# Offload

A fast, intelligent bookmarking and reading checklist application designed to capture, enrich, and organize web content with zero friction. Built with modern full-stack TypeScript, Clean / Screaming Architecture, Domain-Driven Design (DDD), and serverless-first persistence.

---

## 🏛️ Architecture & Design Principles

Offload is organized following **Screaming Architecture** and **Hexagonal (Ports & Adapters)** patterns. The codebase screams its business domains rather than its frameworks:

```
src/
├── modules/                   # Bounded Contexts
│   ├── bookmark/              # Core bookmark domain: ingestion, scraping, status
│   │   ├── domain/            # Entities, Value Objects, Domain Events & Services
│   │   ├── application/       # Command/Query handlers (Use Cases)
│   │   ├── infrastructure/    # Repository adapters, scrapers, telemetry decorators
│   │   └── ui/                # Presentational components & interactive views
│   ├── categorization/        # Automated AI categorization engine
│   │   ├── domain/            # Taxonomies, category entities
│   │   ├── application/       # Categorization handlers & folder tree queries
│   │   └── infrastructure/    # Vercel AI SDK adapters (Gemini / OpenAI / Heuristic)
│   ├── auth/                  # Identity & session management
│   │   └── application/       # Session resolution & tenant verification
│   └── admin/                 # Backoffice administration & data migrations
│       ├── domain/            # Admin authorization service
│       └── application/       # Legacy bookmark migration commands
├── shared/                    # Cross-cutting foundational primitives
│   ├── domain/                # Result pattern, AppError hierarchy
│   ├── infrastructure/        # Drizzle DB client (LibSQL), Auth server, Telemetry
│   └── ui/                    # Shared design system components & layout
└── routes/                    # React Router v7 endpoints (Thin presentation adapters)
```

### Key Architectural Pillars

1. **Domain Isolation & Pure Core**:
   - Entities and business invariants live strictly inside `domain/` without dependencies on database libraries, web frameworks, or third-party SDKs.
   - Aggregate Deciders encapsulate state transitions deterministically.
2. **Multi-Tenant Data Isolation**:
   - Every read and write operation is scoped to authenticated tenant IDs (`user_id`).
   - Tenant isolation is strictly enforced at repository ports and verified with dedicated test suites.
3. **Decorator-Driven Telemetry**:
   - Repository interfaces are wrapped with profiling decorators that capture operation timings and surface them transparently via `Server-Timing` HTTP headers.
4. **Resilient AI Ingestion Pipeline**:
   - URL scraping uses an adaptive fallback strategy (OpenGraph metadata extraction -> Cheerio HTML parsing -> heuristic classification).
   - Categorization supports multiple LLM providers (Google Gemini / OpenAI) with automatic fallback to deterministic heuristic tagging if credentials are not configured.
5. **Universal SQLite / LibSQL Persistence**:
   - Uses `@libsql/client` (pure JavaScript driver) paired with **Drizzle ORM**.
   - Zero native C++ bindings: runs identically in local dev (`file:sqlite.db`) and on Vercel Serverless / Cloud Turso (`libsql://`).

---

## 🛠️ Tech Stack

- **Framework**: [React Router v7](https://reactrouter.com/) (SSR & Framework mode with Vite)
- **Database & ORM**: [Drizzle ORM](https://orm.drizzle.team/) + [LibSQL / Turso](https://turso.tech/)
- **Authentication**: [Better Auth](https://www.better-auth.com/) (GitHub & Google OAuth, session cookies)
- **AI & Enrichment**: [Vercel AI SDK](https://sdk.vercel.ai/) (Google Gemini & OpenAI providers) + [Cheerio](https://cheerio.js.org/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit, domain, and integration test suites)
- **Styling**: Tailwind CSS & Modern CSS

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20+` or `v22+`
- **npm**: `v10+`

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/alejogs4/offload.git
   cd offload
   npm install
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Initialize the database schema:
   ```bash
   npm run db:push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

---

## 🧪 Testing

Run the Vitest test suite:

```bash
npm test
```

Typechecking without emitting files:

```bash
npm run typecheck
```

---

## 📚 Documentation

- [Architecture & Design System](docs/architecture.md)
- [Deployment Guide (Turso + Vercel)](docs/deployment.md)

