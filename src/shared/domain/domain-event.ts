export interface DomainEvent<T = unknown> {
  eventId: string;
  eventName: string;
  occurredAt: Date;
  payload: T;
}

export interface EventHandler<E extends DomainEvent = DomainEvent> {
  (event: E): Promise<void> | void;
}

export interface EventBusPort {
  publish<E extends DomainEvent>(event: E): Promise<void>;
  subscribe<E extends DomainEvent>(eventName: string, handler: EventHandler<E>): void;
}
