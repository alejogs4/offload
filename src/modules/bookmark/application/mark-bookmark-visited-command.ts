import { BookmarkVisitedEvent } from "../domain/bookmark-events";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";
import { EventBusPort } from "~/shared/domain/domain-event";

export interface MarkBookmarkVisitedInput {
  bookmarkId: string;
  userId: string;
}

export class MarkBookmarkVisitedCommandHandler {
  constructor(
    private repository: BookmarkRepositoryPort,
    private eventBus: EventBusPort
  ) {}

  async execute(input: MarkBookmarkVisitedInput): Promise<void> {
    const bookmark = await this.repository.findById(input.bookmarkId);
    if (!bookmark) {
      throw new Error(`Bookmark not found: ${input.bookmarkId}`);
    }

    if (bookmark.userId !== input.userId) {
      throw new Error("Unauthorized access to bookmark");
    }

    bookmark.markAsVisited();
    await this.repository.update(bookmark);

    await this.eventBus.publish(
      new BookmarkVisitedEvent({
        bookmarkId: bookmark.id,
        userId: bookmark.userId,
      })
    );
  }
}
