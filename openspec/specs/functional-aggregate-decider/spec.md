# Specification: Functional Aggregate Decider & Sum Type State Transitions

## Capability: `functional-aggregate-decider`

### Description
Domain aggregates MUST be decoupled from state storage, acting as invariant checkers that generate members of an event Sum Type (Discriminated Union). State transitions MUST be executed via a protected `evolve` method defined in `BaseEntity<TState, TEvent>`.

---

### Requirements

#### Requirement 1: BaseEntity Contract
The system MUST provide an abstract base class `BaseEntity<TState, TEvent>`:
- MUST define `protected abstract evolve(state: TState | null, event: TEvent): TState;`
- MUST define `public transition(state: TState | null, event: TEvent): TState;` which delegates to `evolve`.

#### Requirement 2: Bookmark Event Sum Type
The system MUST define a discriminated union `BookmarkEvent`:
- `BookmarkCreated`: payload containing initial `BookmarkState`.
- `BookmarkCategorized`: payload containing `{ id: string; category: string; subcategory: string; updatedAt: Date }`.
- `BookmarkVisited`: payload containing `{ id: string; userId: string; visitedAt: Date }`.

#### Requirement 3: Aggregate Invariant Enforcement
The `Bookmark` aggregate class MUST enforce the following domain invariants:
- `create`: Validates inputs against `BookmarkStateSchema`, sets initial status to `"pending"`, and returns `{ event: BookmarkEvent, evolved: BookmarkState }`.
- `markAsVisited`: 
  - MUST verify that `state.userId === userId`; otherwise, MUST throw an unauthorized domain error.
  - MUST verify that `state.status !== "visited"`; otherwise, MUST throw an invalid state domain error.
  - MUST produce a `BookmarkVisited` event and return the evolved state with `status: "visited"`.
- `categorize`:
  - MUST verify that `category` is non-empty.
  - MUST produce a `BookmarkCategorized` event and return the evolved state with updated category and subcategory.

#### Requirement 4: State Evolution Pattern Matching
The `Bookmark` class MUST implement `protected evolve(state: BookmarkState | null, event: BookmarkEvent): BookmarkState` using exhaustive pattern matching (`switch(event.type)`) without performing side effects or mutations.

---

### Scenarios

#### Scenario 1: Successful Bookmark Creation
- **GIVEN** valid bookmark creation parameters
- **WHEN** `bookmarkAggregate.create(params)` is executed
- **THEN** it MUST return a `BookmarkCreated` event and an evolved `BookmarkState` with `status: "pending"`.

#### Scenario 2: Marking Bookmark as Visited
- **GIVEN** an existing `BookmarkState` with `status: "pending"` belonging to `"user-123"`
- **WHEN** `bookmarkAggregate.markAsVisited(state, "user-123")` is called
- **THEN** it MUST return a `BookmarkVisited` event and an evolved `BookmarkState` with `status: "visited"` and updated timestamp.

#### Scenario 3: Prevent Marking Already Visited Bookmark
- **GIVEN** an existing `BookmarkState` with `status: "visited"`
- **WHEN** `bookmarkAggregate.markAsVisited(state, "user-123")` is called
- **THEN** it MUST throw an error indicating the bookmark is already visited.

#### Scenario 4: Prevent Unauthorized State Mutation
- **GIVEN** an existing `BookmarkState` belonging to `"user-owner"`
- **WHEN** `bookmarkAggregate.markAsVisited(state, "attacker-user")` is called
- **THEN** it MUST throw an unauthorized error.
