import { DomainEvent, EventBusPort, EventHandler } from "~/shared/domain/domain-event";

export class InMemoryEventBus implements EventBusPort {
  private static instance: InMemoryEventBus;
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  public static getInstance(): InMemoryEventBus {
    if (!InMemoryEventBus.instance) {
      InMemoryEventBus.instance = new InMemoryEventBus();
    }
    return InMemoryEventBus.instance;
  }

  subscribe<E extends DomainEvent>(eventName: string, handler: EventHandler<E>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);
  }

  async publish<E extends DomainEvent>(event: E): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventName);
    if (!eventHandlers || eventHandlers.size === 0) {
      return;
    }

    const promises = Array.from(eventHandlers).map((handler) =>
      Promise.resolve().then(() => handler(event)).catch((err) => {
        console.error(`[EventBus] Error handling event ${event.eventName}:`, err);
      })
    );

    await Promise.all(promises);
  }

  clearHandlers(): void {
    this.handlers.clear();
  }
}

export const eventBus = InMemoryEventBus.getInstance();
