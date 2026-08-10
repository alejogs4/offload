# Auto-Categorization Specification

## Purpose
Infers taxonomy (Category and Subcategory) for bookmarks using Vercel AI SDK and scraped metadata.

## Requirements

### Requirement: AI Taxonomy Inference
The system MUST analyze scraped bookmark metadata and assign a primary Category and Subcategory.

#### Scenario: Successful Auto-Categorization
- GIVEN a newly created bookmark with scraped title and description
- WHEN `BookmarkCreatedEvent` triggers the categorization handler
- THEN the system MUST send metadata to Vercel AI SDK `generateObject`
- AND update the bookmark with inferred `category` and `subcategory`
- AND emit `BookmarkCategorizedEvent`

#### Scenario: AI Provider Failure Fallback
- GIVEN the AI service encounters a rate limit or API failure
- WHEN the categorization handler executes
- THEN the system MUST assign `category: "Uncategorized"` and `subcategory: "General"`
- AND log the categorization warning without deleting the bookmark
