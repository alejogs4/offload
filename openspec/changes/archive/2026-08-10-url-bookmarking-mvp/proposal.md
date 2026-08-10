# Proposal: URL Bookmarking & Auto-Categorization MVP

## Intent
Build an MVP web platform to save URLs, automatically scrape metadata, auto-categorize links into folder hierarchies using AI, and manage reading progress through a checklist interface.

## Scope

### In Scope
- URL paste ingestion bar with title/metadata extraction.
- Automatic AI-powered categorization into Category and Subcategory.
- Folder tree UI grouping bookmarks by taxonomy.
- Interactive checklist with "visited" state toggle (via click or checkbox).
- CQRS & Hexagonal backend structure with an in-process Domain Event Bus.
- Single-owner Passcode Protection (`APP_PASSWORD` env var + HTTPOnly cookie) for secure personal deployment.

### Out of Scope
- Multi-tenant user registration & social OAuth flows (deferred to post-MVP; domain layer receives `userId` for future-proof compatibility).
- Custom user taxonomy rule engines.
- Browser extensions.

## Capabilities

### New Capabilities
- `passcode-auth`: Single-owner passcode verification and session cookie management.
- `bookmark-ingestion`: Ingesting URLs, fetching OpenGraph tags, and storing bookmarks.
- `auto-categorization`: Extracting categories and subcategories using Vercel AI SDK.
- `checklist-management`: Grouping bookmarks into folder trees, filtering, and toggling visited state.

### Modified Capabilities
- None

## Approach
- **Stack**: Remix / React Router (v7) + SQLite (`drizzle-orm` + `better-sqlite3`).
- **Pattern**: Hexagonal Architecture + CQRS + Domain Events.
  - **Loaders**: Execute read Queries (`GetFolderTreeQuery`, `GetPendingBookmarksQuery`).
  - **Actions**: Execute write Commands (`CreateBookmarkCommand`, `MarkBookmarkVisitedCommand`).
  - **Event Bus**: Emits `BookmarkCreatedEvent` to trigger asynchronous `CategorizeBookmarkCommand`.
  - **AI Integration**: Vercel AI SDK (`generateObject` + Zod) behind `CategorizerPort`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/` | New | Entities (`Bookmark`, `Category`), Domain Events, Port Interfaces |
| `src/application/` | New | Command & Query handlers, Event Listeners |
| `src/infrastructure/` | New | Drizzle SQLite DB Repository, Cheerio Scraper, Vercel AI Categorizer |
| `src/routes/` | New | Remix Loaders & Actions dispatching Queries and Commands |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scraping blocked by target server | Medium | Fall back to URL domain name for title |
| AI API rate limits or timeout | Low | Default to `Uncategorized` folder on AI failure |

## Rollback Plan
- Delete SQLite database file or revert DB schema migrations via `drizzle-kit drop`.
- Revert project repository commit to pre-feature tag.

## Dependencies
- `@remix-run/node`, `react-router`
- `drizzle-orm`, `better-sqlite3`
- `ai`, `@ai-sdk/google` (or `@ai-sdk/openai`), `zod`
- `cheerio`

## Success Criteria
- [ ] User can paste a URL and see title + domain scraped successfully.
- [ ] Bookmark is automatically assigned Category/Subcategory via Vercel AI SDK.
- [ ] Bookmarks appear grouped in folder tree checklist view.
- [ ] Checking or clicking link moves bookmark from "pending" to "visited" tab.
