import { z } from "zod";
import { Bookmark } from "../domain/bookmark";
import {
  BookmarkState,
  UrlSchema,
  UserIdSchema,
  DefaultTaxonomy,
} from "../domain/bookmark-schema";
import { BookmarkCreatedEvent } from "../domain/bookmark-events";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";
import { MetadataScraperPort } from "../domain/metadata-scraper-port";
import { EventBusPort } from "~/shared/domain/domain-event";
import { CategorizerPort } from "~/modules/categorization/domain/categorizer-port";

export const CreateBookmarkInputSchema = z.object({
  userId: UserIdSchema,
  url: UrlSchema,
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>;

export class CreateBookmarkCommandHandler {
  private bookmarkAggregate = new Bookmark();

  constructor(
    private repository: BookmarkRepositoryPort,
    private scraper: MetadataScraperPort,
    private eventBus: EventBusPort,
    private categorizer?: CategorizerPort
  ) {}

  async execute(rawInput: CreateBookmarkInput): Promise<BookmarkState> {
    const input = CreateBookmarkInputSchema.parse(rawInput);
    const scraped = await this.scraper.scrape(input.url);

    let category: string = DefaultTaxonomy.CATEGORY;
    let subcategory: string = DefaultTaxonomy.SUBCATEGORY;

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

    const { event, evolved } = this.bookmarkAggregate.create({
      userId: input.userId,
      url: input.url,
      title: scraped.title,
      description: scraped.description,
      ogImage: scraped.ogImage,
      category,
      subcategory,
    });

    await this.repository.save(evolved);

    await this.eventBus.publish(
      new BookmarkCreatedEvent({
        bookmarkId: evolved.id,
        userId: evolved.userId,
        url: evolved.url,
        title: evolved.title,
        description: evolved.description,
      })
    );

    return evolved;
  }
}
