import { z } from "zod";
import { BookmarkIdSchema, UserIdSchema } from "../domain/bookmark-schema";
import { BookmarkStarredToggledEvent } from "../domain/bookmark-events";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";
import { EventBusPort } from "~/shared/domain/domain-event";

export const ToggleBookmarkStarredInputSchema = z.object({
  bookmarkId: BookmarkIdSchema,
  userId: UserIdSchema,
  isStarred: z.boolean(),
});

export type ToggleBookmarkStarredInput = z.infer<typeof ToggleBookmarkStarredInputSchema>;

export class ToggleBookmarkStarredCommandHandler {
  constructor(
    private repository: BookmarkRepositoryPort,
    private eventBus: EventBusPort
  ) {}

  async execute(rawInput: ToggleBookmarkStarredInput): Promise<void> {
    const input = ToggleBookmarkStarredInputSchema.parse(rawInput);

    // Single atomic database round-trip
    const evolved = await this.repository.toggleStarred(
      input.bookmarkId,
      input.userId,
      input.isStarred
    );

    await this.eventBus.publish(
      new BookmarkStarredToggledEvent({
        bookmarkId: evolved.id,
        userId: evolved.userId,
        isStarred: evolved.isStarred,
      })
    );
  }
}
