import { z } from "zod";
import { BookmarkIdSchema, UserIdSchema } from "../domain/bookmark-schema";
import { BookmarkVisitedEvent } from "../domain/bookmark-events";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";
import { EventBusPort } from "~/shared/domain/domain-event";

export const MarkBookmarkVisitedInputSchema = z.object({
  bookmarkId: BookmarkIdSchema,
  userId: UserIdSchema,
});

export type MarkBookmarkVisitedInput = z.infer<typeof MarkBookmarkVisitedInputSchema>;

export class MarkBookmarkVisitedCommandHandler {
  constructor(
    private repository: BookmarkRepositoryPort,
    private eventBus: EventBusPort
  ) {}

  async execute(rawInput: MarkBookmarkVisitedInput): Promise<void> {
    const input = MarkBookmarkVisitedInputSchema.parse(rawInput);

    // Single atomic database round-trip
    const evolved = await this.repository.markAsVisited(input.bookmarkId, input.userId);

    await this.eventBus.publish(
      new BookmarkVisitedEvent({
        bookmarkId: evolved.id,
        userId: evolved.userId,
      })
    );
  }
}

