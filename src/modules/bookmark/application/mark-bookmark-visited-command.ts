import { z } from "zod";
import { Bookmark } from "../domain/bookmark";
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
  private bookmarkAggregate = new Bookmark();

  constructor(
    private repository: BookmarkRepositoryPort,
    private eventBus: EventBusPort
  ) {}

  async execute(rawInput: MarkBookmarkVisitedInput): Promise<void> {
    const input = MarkBookmarkVisitedInputSchema.parse(rawInput);
    const state = await this.repository.findById(input.bookmarkId);
    if (!state) {
      throw new Error(`Bookmark not found: ${input.bookmarkId}`);
    }

    const { event, evolved } = this.bookmarkAggregate.markAsVisited(state, input.userId);
    await this.repository.update(evolved);

    await this.eventBus.publish(
      new BookmarkVisitedEvent({
        bookmarkId: evolved.id,
        userId: evolved.userId,
      })
    );
  }
}
