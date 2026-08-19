# Optimistic Revalidation Specification

## Purpose
Provides responsive real-time feedback in the UI using optimistic processing cards and poll-on-demand revalidation while items are being enriched.

## Requirements

### Requirement: Processing Queue Display
The UI MUST render bookmarks currently in `processing` status in a dedicated "Processing Queue" with animated loading indicators.

#### Scenario: User Submits URL and Sees Processing Card
- GIVEN a user on the dashboard
- WHEN they submit a new URL
- THEN the form input MUST clear immediately
- AND a processing skeleton card with the target URL MUST appear in the queue

### Requirement: Poll-on-Demand Revalidation
The UI MUST automatically poll for status updates every 2 seconds ONLY when there are active items with `status === 'processing'`.

#### Scenario: Dynamic Polling Starts and Stops
- GIVEN the dashboard has 1 or more items in `processing` status
- WHEN the component is mounted or an item is submitted
- THEN the system MUST revalidate the loader data every 2000ms
- AND once all items reach `pending` or `failed` status, the polling timer MUST be cleared automatically
