import { Bookmark } from "../bookmark";
import { BookmarkState } from "../bookmark-schema";
import { BookmarkRepositoryPort } from "../bookmark-repository-port";
import { MetadataScraperPort } from "../metadata-scraper-port";
import { CategorizerPort } from "~/modules/categorization/domain/categorizer-port";
import { DefaultTaxonomy } from "../bookmark-category";
import { EventBusPort } from "~/shared/domain/domain-event";
import { BookmarkCategorizedEvent } from "../bookmark-events";

export class BookmarkEnrichmentService {
  private bookmarkAggregate = new Bookmark();

  constructor(
    private readonly repository: BookmarkRepositoryPort,
    private readonly scraper: MetadataScraperPort,
    private readonly categorizer: CategorizerPort,
    private readonly eventBus: EventBusPort
  ) {}

  async enrich(bookmark: BookmarkState): Promise<BookmarkState> {
    let defaultHostname = "";
    try {
      defaultHostname = new URL(bookmark.url).hostname;
    } catch {
      defaultHostname = bookmark.url;
    }

    let scraped = {
      title: bookmark.title || defaultHostname,
      description: bookmark.description || "",
      ogImage: bookmark.ogImage,
    };

    try {
      const res = await this.scraper.scrape(bookmark.url);
      scraped = {
        title: res.title || scraped.title,
        description: res.description ?? scraped.description,
        ogImage: res.ogImage || scraped.ogImage,
      };
    } catch (err) {
      console.warn(`[BookmarkEnrichmentService] Scraping fallback for ${bookmark.url}:`, err);
    }

    let taxonomy = {
      category: bookmark.category || DefaultTaxonomy.CATEGORY,
      subcategory: bookmark.subcategory || DefaultTaxonomy.SUBCATEGORY,
    };

    try {
      const result = await this.categorizer.categorize(
        scraped.title,
        scraped.description,
        bookmark.url
      );
      if (result && result.category) {
        taxonomy = {
          category: result.category,
          subcategory: result.subcategory || DefaultTaxonomy.SUBCATEGORY,
        };
      }
    } catch (err) {
      console.warn(`[BookmarkEnrichmentService] Categorization fallback for ${bookmark.url}:`, err);
    }

    const { evolved } = this.bookmarkAggregate.completeProcessing(bookmark, {
      title: scraped.title,
      description: scraped.description,
      ogImage: scraped.ogImage,
      category: taxonomy.category,
      subcategory: taxonomy.subcategory,
    });

    await this.repository.update(evolved);

    await this.eventBus.publish(
      new BookmarkCategorizedEvent({
        bookmarkId: evolved.id,
        category: evolved.category,
        subcategory: evolved.subcategory,
      })
    );

    return evolved;
  }
}
