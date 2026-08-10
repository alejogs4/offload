# Checklist Management Specification

## Purpose
Renders categorized folder trees and handles bookmark status transitions (`pending` -> `visited`).

## Requirements

### Requirement: Categorized Folder Tree Rendering
The system MUST display pending bookmarks grouped in collapsible Category > Subcategory folders.

#### Scenario: Pending Folder List Display
- GIVEN stored bookmarks with status `pending`
- WHEN the user opens the main dashboard
- THEN the system MUST render bookmarks grouped by Category and Subcategory
- AND show each item with a checkbox and external link

### Requirement: Visited Status Transition
The system MUST transition bookmark status to `visited` when checked or opened.

#### Scenario: Marking Bookmark as Visited via Checkbox
- GIVEN a bookmark with status `pending`
- WHEN the user clicks its checkbox
- THEN the system MUST update status to `visited`
- AND remove it from the active `pending` checklist view
- AND emit `BookmarkVisitedEvent`

#### Scenario: Marking Bookmark as Visited via Link Click
- GIVEN a bookmark with status `pending`
- WHEN the user clicks the URL link to open target website
- THEN the system MUST open the destination URL in a new tab
- AND update bookmark status to `visited`
