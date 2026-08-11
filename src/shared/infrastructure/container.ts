import { DrizzleBookmarkRepository } from "~/modules/bookmark/infrastructure/drizzle-bookmark-repository";
import { CheerioMetadataScraper } from "~/modules/bookmark/infrastructure/cheerio-metadata-scraper";
import { CreateBookmarkCommandHandler } from "~/modules/bookmark/application/create-bookmark-command";
import { MarkBookmarkVisitedCommandHandler } from "~/modules/bookmark/application/mark-bookmark-visited-command";
import { VercelAiCategorizerAdapter } from "~/modules/categorization/infrastructure/vercel-ai-categorizer-adapter";
import { CategorizeBookmarkHandler } from "~/modules/categorization/application/categorize-bookmark-handler";
import { GetFolderTreeQueryHandler } from "~/modules/categorization/application/get-folder-tree-query";
import { eventBus } from "./events/in-memory-event-bus";

// Singleton instances for ports & adapters
export const bookmarkRepository = new DrizzleBookmarkRepository();
export const metadataScraper = new CheerioMetadataScraper();
export const categorizer = new VercelAiCategorizerAdapter();

// Application Command & Query Handlers
export const createBookmarkHandler = new CreateBookmarkCommandHandler(
  bookmarkRepository,
  metadataScraper,
  eventBus,
  categorizer
);

export const markBookmarkVisitedHandler = new MarkBookmarkVisitedCommandHandler(
  bookmarkRepository,
  eventBus
);

export const categorizeBookmarkHandler = new CategorizeBookmarkHandler(
  bookmarkRepository,
  categorizer,
  eventBus
);

export const getFolderTreeQuery = new GetFolderTreeQueryHandler(bookmarkRepository);

// Wire Domain Event subscriptions
eventBus.subscribe("BookmarkCreatedEvent", (event: any) => {
  categorizeBookmarkHandler.handle(event);
});
