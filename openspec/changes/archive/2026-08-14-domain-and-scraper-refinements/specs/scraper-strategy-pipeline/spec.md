# Specification: Metadata Scraper Strategy & Pipeline Architecture

## Capability: `scraper-strategy-pipeline`

### Description
The metadata scraper MUST be decomposed into modular, isolated extraction strategies orchestrated by a pipeline and instantiated through a factory.

---

### Requirements

#### Requirement 1: Metadata Extractor Strategy Interface
The system MUST define a `MetadataExtractorStrategy` interface:
- `canExtract(ctx: ExtractionContext): boolean`
- `extract(ctx: ExtractionContext): Promise<Partial<ScrapedMetadata> | null>`

Where `ExtractionContext` provides:
- `url`: Parsed `URL` object
- `rawUrl`: Original URL string
- `html?: string`
- `$?: cheerio.CheerioAPI`
- `fetchHtml(): Promise<{ html: string; $: cheerio.CheerioAPI }>`

#### Requirement 2: Concrete Strategies
The system MUST provide dedicated strategies:
1. `OEmbedExtractionStrategy`: Intercepts URLs from supported providers (e.g. YouTube) and extracts metadata via lightweight oEmbed endpoints before full page download.
2. `JsonLdExtractionStrategy`: Extracts structured `schema.org` data from `<script type="application/ld+json">`.
3. `OpenGraphExtractionStrategy`: Extracts `og:*` and `twitter:*` meta tags.
4. `HtmlFallbackExtractionStrategy`: Extracts `<title>`, `<h1>`, and first significant `<p>` tag.
5. `DomainFallbackExtractionStrategy`: Generates heuristic fallback title and description when external fetch fails or network errors occur.

#### Requirement 3: Pipeline Metadata Scraper
The system MUST provide `PipelineMetadataScraper`:
- MUST execute strategies in configured order.
- MUST merge partial metadata fields (`title`, `description`, `ogImage`) until all fields are satisfied.
- MUST guarantee that a title and description are always returned (via fallback if needed).

#### Requirement 4: Metadata Scraper Factory
The system MUST provide `MetadataScraperFactory`:
- `createDefaultScraper(options?)`: Assembles the standard strategy chain.
- Allows registering custom strategies or passing custom HTTP fetchers/timeouts for testing.

---

### Scenarios

#### Scenario 1: YouTube Link Handled by OEmbed
- **GIVEN** a YouTube video URL
- **WHEN** scraped by `PipelineMetadataScraper`
- **THEN** `OEmbedExtractionStrategy` MUST extract the title, author, and thumbnail without parsing standard HTML body tags.

#### Scenario 2: Standard Web Page with OpenGraph & JSON-LD
- **GIVEN** a web page with both OpenGraph tags and JSON-LD schema
- **WHEN** scraped by `PipelineMetadataScraper`
- **THEN** high-priority metadata MUST be extracted and merged into a complete `ScrapedMetadata` object.

#### Scenario 3: Broken URL Falls Back to Domain Heuristics
- **GIVEN** a URL that responds with HTTP 404/500 or network timeout
- **WHEN** scraped by `PipelineMetadataScraper`
- **THEN** `DomainFallbackExtractionStrategy` MUST generate a title based on the hostname and a clean fallback description without throwing an unhandled exception.
