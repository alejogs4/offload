# Async Bookmark Processing Specification

## Purpose
Executes asynchronous metadata extraction and AI categorization for bookmarks in background serverless contexts using `waitUntil` and Turso Cloud database.

## Requirements

### Requirement: Background Enrichment Execution
The system MUST asynchronously enrich bookmarks by scraping HTML metadata, generating AI taxonomy, and updating the database row to `status: "pending"`.

#### Scenario: Full Background Enrichment
- GIVEN a newly created bookmark with status `processing`
- WHEN `ProcessBookmarkHandler` executes in the background
- THEN the system MUST scrape the URL for title, description, and OpenGraph image
- AND send the extracted metadata to Vercel AI SDK for category/subcategory inference
- AND update the bookmark in Turso with status `pending`, final title, description, image, and category

#### Scenario: AI Failure Graceful Fallback
- GIVEN an AI provider failure (e.g. rate limit or missing API key) during background enrichment
- WHEN the background task runs
- THEN the system MUST assign `category: "Uncategorized"` and `subcategory: "General"`
- AND update the bookmark status to `pending` so the user can still read the bookmark
