import { DrizzleBookmarkRepository } from "~/modules/bookmark/infrastructure/drizzle-bookmark-repository";
import { TelemetryBookmarkRepositoryDecorator } from "~/modules/bookmark/infrastructure/telemetry-bookmark-repository-decorator";
import { MetadataScraperFactory } from "~/modules/bookmark/infrastructure/scraper/metadata-scraper-factory";
import { CreateBookmarkCommandHandler } from "~/modules/bookmark/application/create-bookmark-command";
import { MarkBookmarkVisitedCommandHandler } from "~/modules/bookmark/application/mark-bookmark-visited-command";
import { VercelAiCategorizerAdapter } from "~/modules/categorization/infrastructure/vercel-ai-categorizer-adapter";
import { CategorizeBookmarkHandler } from "~/modules/categorization/application/categorize-bookmark-handler";
import { GetFolderTreeQueryHandler } from "~/modules/categorization/application/get-folder-tree-query";
import { BookmarkEnrichmentService } from "~/modules/bookmark/domain/services/bookmark-enrichment-service";
import { eventBus } from "./events/in-memory-event-bus";

// Singleton instances for ports & adapters
const rawBookmarkRepository = new DrizzleBookmarkRepository();
export const bookmarkRepository = new TelemetryBookmarkRepositoryDecorator(rawBookmarkRepository);
export const metadataScraper = MetadataScraperFactory.createDefault();
export const categorizer = new VercelAiCategorizerAdapter();

// Domain Services
export const bookmarkEnrichmentService = new BookmarkEnrichmentService(
  bookmarkRepository,
  metadataScraper,
  categorizer,
  eventBus
);

// Application Command & Query Handlers
export const createBookmarkHandler = new CreateBookmarkCommandHandler(
  bookmarkRepository,
  bookmarkEnrichmentService,
  eventBus
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
