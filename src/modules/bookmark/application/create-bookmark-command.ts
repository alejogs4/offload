import { Bookmark } from "../domain/bookmark";
import { BookmarkCreatedEvent } from "../domain/bookmark-events";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";
import { MetadataScraperPort } from "../domain/metadata-scraper-port";
import { EventBusPort } from "~/shared/domain/domain-event";
import { CategorizerPort } from "~/modules/categorization/domain/categorizer-port";

export interface CreateBookmarkInput {
  userId: string;
  url: string;
}

export class CreateBookmarkCommandHandler {
  constructor(
    private repository: BookmarkRepositoryPort,
    private scraper: MetadataScraperPort,
    private eventBus: EventBusPort,
    private categorizer?: CategorizerPort
  ) {}

  async execute(input: CreateBookmarkInput): Promise<Bookmark> {
    const scraped = await this.scraper.scrape(input.url);

    let category = "Uncategorized";
    let subcategory = "General";

    if (this.categorizer) {
      try {
        const result = await this.categorizer.categorize(
          scraped.title,
          scraped.description,
          input.url
        );
        category = result.category || category;
        subcategory = result.subcategory || subcategory;
      } catch (err) {
        console.warn("[CreateBookmarkCommandHandler] Categorization inline warning:", err);
      }
    }

    const bookmark = new Bookmark({
      id: crypto.randomUUID(),
      userId: input.userId,
      url: input.url,
      title: scraped.title,
      description: scraped.description,
      ogImage: scraped.ogImage,
      category,
      subcategory,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repository.save(bookmark);

    await this.eventBus.publish(
      new BookmarkCreatedEvent({
        bookmarkId: bookmark.id,
        userId: bookmark.userId,
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
      })
    );

    return bookmark;
  }
}
