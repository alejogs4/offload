import { DomainEvent } from "~/shared/domain/domain-event";
import { BookmarkState } from "./bookmark-schema";

/**
 * Domain Event Sum Type (Discriminated Union)
 * Used by aggregates and pure reducer functions to evolve domain state.
 */
export type BookmarkEvent =
  | { type: "BookmarkCreated"; payload: BookmarkState }
  | { type: "BookmarkCategorized"; payload: { id: string; category: string; subcategory: string; updatedAt: Date } }
  | { type: "BookmarkVisited"; payload: { id: string; userId: string; visitedAt: Date } };

// Event Bus payload representations
export interface BookmarkCreatedPayload {
  bookmarkId: string;
  userId: string;
  url: string;
  title: string;
  description: string;
}

export class BookmarkCreatedEvent implements DomainEvent<BookmarkCreatedPayload> {
  readonly eventId: string;
  readonly eventName = "BookmarkCreatedEvent";
  readonly occurredAt: Date;
  readonly payload: BookmarkCreatedPayload;

  constructor(payload: BookmarkCreatedPayload) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    this.payload = payload;
  }
}

export interface BookmarkCategorizedPayload {
  bookmarkId: string;
  category: string;
  subcategory: string;
}

export class BookmarkCategorizedEvent implements DomainEvent<BookmarkCategorizedPayload> {
  readonly eventId: string;
  readonly eventName = "BookmarkCategorizedEvent";
  readonly occurredAt: Date;
  readonly payload: BookmarkCategorizedPayload;

  constructor(payload: BookmarkCategorizedPayload) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    this.payload = payload;
  }
}

export interface BookmarkVisitedPayload {
  bookmarkId: string;
  userId: string;
}

export class BookmarkVisitedEvent implements DomainEvent<BookmarkVisitedPayload> {
  readonly eventId: string;
  readonly eventName = "BookmarkVisitedEvent";
  readonly occurredAt: Date;
  readonly payload: BookmarkVisitedPayload;

  constructor(payload: BookmarkVisitedPayload) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    this.payload = payload;
  }
}
