import { BookmarkCreatedEvent, BookmarkCategorizedEvent } from "~/modules/bookmark/domain/bookmark-events";
import { BookmarkRepositoryPort } from "~/modules/bookmark/domain/bookmark-repository-port";
import { CategorizerPort } from "../domain/categorizer-port";
import { EventBusPort } from "~/shared/domain/domain-event";

export class CategorizeBookmarkHandler {
  constructor(
    private repository: BookmarkRepositoryPort,
    private categorizer: CategorizerPort,
    private eventBus: EventBusPort
  ) {}

  async handle(event: BookmarkCreatedEvent): Promise<void> {
    const { bookmarkId, title, description, url } = event.payload;

    const bookmark = await this.repository.findById(bookmarkId);
    if (!bookmark) return;

    const result = await this.categorizer.categorize(title, description, url);
    bookmark.categorize(result.category, result.subcategory);

    await this.repository.update(bookmark);

    await this.eventBus.publish(
      new BookmarkCategorizedEvent({
        bookmarkId,
        category: result.category,
        subcategory: result.subcategory,
      })
    );
  }
}
