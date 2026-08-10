# Bookmark Ingestion Specification

## Purpose
Manages URL ingestion, HTML metadata scraping (OpenGraph), and initial bookmark persistence.

## Requirements

### Requirement: URL Ingestion and Metadata Scraping
The system MUST validate submitted URLs, scrape target page metadata, and persist the bookmark in `pending` status.

#### Scenario: Successful URL Ingestion
- GIVEN a valid URL `https://example.com/article`
- WHEN the user submits the URL
- THEN the system MUST scrape the page title, description, and OpenGraph image
- AND store the bookmark with status `pending`
- AND emit a `BookmarkCreatedEvent`

#### Scenario: Metadata Scraping Fallback
- GIVEN a valid URL where target server blocks HTML scraping or returns 403/500
- WHEN the user submits the URL
- THEN the system MUST extract the hostname as the default title
- AND store the bookmark successfully without crashing
