# Delta for Bookmark Ingestion

## MODIFIED Requirements

### Requirement: URL Ingestion and Metadata Scraping
The system MUST validate submitted URLs, immediately persist an initial bookmark record with status `processing`, and trigger a background task to complete scraping and categorization.
(Previously: Ingestion synchronously scraped metadata and stored the bookmark in pending status on the HTTP request thread)

#### Scenario: Immediate Ingestion Acknowledgment
- GIVEN a valid URL `https://example.com/article`
- WHEN the user submits the URL
- THEN the system MUST generate a unique Bookmark ID
- AND persist the initial record with status `processing` and hostname title
- AND register the background processing task via `waitUntil`
- AND return an immediate HTTP response (< 50ms) to the user

#### Scenario: Metadata Scraping Fallback
- GIVEN a valid URL where target server blocks HTML scraping or returns 403/500
- WHEN the background task executes the scrape step
- THEN the system MUST extract the hostname as the default title
- AND continue to the categorization step without throwing an unhandled error
