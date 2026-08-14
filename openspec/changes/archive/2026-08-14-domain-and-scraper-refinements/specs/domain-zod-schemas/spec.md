# Specification: Domain Zod Schemas & Value Objects

## Capability: `domain-zod-schemas`

### Description
Domain primitives and state structures MUST be modeled with Zod schemas as the single source of truth for runtime validation and static TypeScript types.

---

### Requirements

#### Requirement 1: Value Object Schemas
The system MUST define Zod schemas for all domain primitives:
- `BookmarkIdSchema`: MUST validate valid UUID strings.
- `UserIdSchema`: MUST validate non-empty user identifier strings.
- `UrlSchema`: MUST validate valid URL strings.
- `BookmarkStatusSchema`: MUST validate enum values `"pending"` or `"visited"`.
- `BookmarkTitleSchema`: MUST validate non-empty string titles.
- `BookmarkDescriptionSchema`: MUST validate string descriptions with a default fallback to `""`.

#### Requirement 2: Domain State Schema
The system MUST define `BookmarkStateSchema` containing:
- `id`: `BookmarkIdSchema`
- `userId`: `UserIdSchema`
- `url`: `UrlSchema`
- `title`: `BookmarkTitleSchema`
- `description`: `BookmarkDescriptionSchema`
- `ogImage`: Optional URL string
- `category`: Non-empty string defaulting to `"Uncategorized"`
- `subcategory`: Non-empty string defaulting to `"General"`
- `status`: `BookmarkStatusSchema`
- `createdAt`: `z.date()`
- `updatedAt`: `z.date()`

The static type `BookmarkState` MUST be inferred via `z.infer<typeof BookmarkStateSchema>`.

---

### Scenarios

#### Scenario 1: Valid State Parsing
- **GIVEN** valid bookmark data with UUID, valid URL, and valid status
- **WHEN** parsed with `BookmarkStateSchema.parse(data)`
- **THEN** it MUST return a typed `BookmarkState` object matching the input.

#### Scenario 2: Invalid URL Rejection
- **GIVEN** bookmark data containing an invalid URL string `"not-a-url"`
- **WHEN** parsed with `BookmarkStateSchema.safeParse(data)`
- **THEN** it MUST return `success: false` with validation errors.

#### Scenario 3: Default Field Resolution
- **GIVEN** bookmark data missing `category`, `subcategory`, or `description`
- **WHEN** parsed with `BookmarkStateSchema.parse(data)`
- **THEN** `category` MUST default to `"Uncategorized"`, `subcategory` to `"General"`, and `description` to `""`.
