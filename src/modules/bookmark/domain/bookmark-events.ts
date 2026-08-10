import { DomainEvent } from "~/shared/domain/domain-event";

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
