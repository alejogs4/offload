import { Bookmark } from "~/modules/bookmark/domain/bookmark";
import { BookmarkCreatedEvent, BookmarkCategorizedEvent } from "~/modules/bookmark/domain/bookmark-events";
import { BookmarkRepositoryPort } from "~/modules/bookmark/domain/bookmark-repository-port";
import { CategorizerPort } from "../domain/categorizer-port";
import { EventBusPort } from "~/shared/domain/domain-event";

export class CategorizeBookmarkHandler {
  private bookmarkAggregate = new Bookmark();

  constructor(
    private repository: BookmarkRepositoryPort,
    private categorizer: CategorizerPort,
    private eventBus: EventBusPort
  ) {}

  async handle(event: BookmarkCreatedEvent): Promise<void> {
    const { bookmarkId, title, description, url } = event.payload;

    const state = await this.repository.findById(bookmarkId);
    if (!state) return;

    const result = await this.categorizer.categorize(title, description, url);
    const { evolved } = this.bookmarkAggregate.categorize(
      state,
      result.category,
      result.subcategory
    );

    await this.repository.update(evolved);

    await this.eventBus.publish(
      new BookmarkCategorizedEvent({
        bookmarkId,
        category: result.category,
        subcategory: result.subcategory,
      })
    );
  }
}
