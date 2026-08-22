import { describe, it, expect, vi } from "vitest";
import { BookmarkEnrichmentService } from "../bookmark-enrichment-service";
import { BookmarkState, BookmarkStatus, DefaultTaxonomy } from "../../bookmark-schema";

describe("BookmarkEnrichmentService", () => {
  const initialProcessingBookmark: BookmarkState = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    userId: "user-1",
    url: "https://example.com/article",
    title: "example.com",
    description: "",
    ogImage: undefined,
    category: DefaultTaxonomy.CATEGORY,
    subcategory: DefaultTaxonomy.SUBCATEGORY,
    status: BookmarkStatus.PROCESSING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should perform full enrichment (scraping + AI categorization) and update to pending", async () => {
    const mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      findAllByUserId: vi.fn(),
      markAsVisited: vi.fn(),
    };

    const mockScraper = {
      scrape: vi.fn().mockResolvedValue({
        title: "Enriched Article Title",
        description: "Enriched article description",
        ogImage: "https://example.com/og.png",
      }),
    };

    const mockCategorizer = {
      categorize: vi.fn().mockResolvedValue({
        category: "Engineering",
        subcategory: "Architecture",
      }),
    };

    const mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };

    const service = new BookmarkEnrichmentService(mockRepo, mockScraper, mockCategorizer, mockEventBus);
    const result = await service.enrich(initialProcessingBookmark);

    expect(mockScraper.scrape).toHaveBeenCalledWith("https://example.com/article");
    expect(mockCategorizer.categorize).toHaveBeenCalledWith(
      "Enriched Article Title",
      "Enriched article description",
      "https://example.com/article"
    );
    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Enriched Article Title",
        description: "Enriched article description",
        ogImage: "https://example.com/og.png",
        category: "Engineering",
        subcategory: "Architecture",
        status: BookmarkStatus.PENDING,
      })
    );
    expect(result.status).toBe(BookmarkStatus.PENDING);
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
  });

  it("should gracefully handle scraping failure by falling back to hostname title", async () => {
    const mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      findAllByUserId: vi.fn(),
      markAsVisited: vi.fn(),
    };

    const mockScraper = {
      scrape: vi.fn().mockRejectedValue(new Error("Network timeout (403 Forbidden)")),
    };

    const mockCategorizer = {
      categorize: vi.fn().mockResolvedValue({
        category: "News",
        subcategory: "General",
      }),
    };

    const mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };

    const service = new BookmarkEnrichmentService(mockRepo, mockScraper, mockCategorizer, mockEventBus);
    const result = await service.enrich(initialProcessingBookmark);

    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "example.com",
        category: "News",
        subcategory: "General",
        status: BookmarkStatus.PENDING,
      })
    );
    expect(result.status).toBe(BookmarkStatus.PENDING);
  });

  it("should gracefully handle AI categorization failure by falling back to default taxonomy", async () => {
    const mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      findAllByUserId: vi.fn(),
      markAsVisited: vi.fn(),
    };

    const mockScraper = {
      scrape: vi.fn().mockResolvedValue({
        title: "Scraped Title",
        description: "Scraped description",
      }),
    };

    const mockCategorizer = {
      categorize: vi.fn().mockRejectedValue(new Error("Rate limit exceeded 429")),
    };

    const mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };

    const service = new BookmarkEnrichmentService(mockRepo, mockScraper, mockCategorizer, mockEventBus);
    const result = await service.enrich(initialProcessingBookmark);

    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Scraped Title",
        description: "Scraped description",
        category: DefaultTaxonomy.CATEGORY,
        subcategory: DefaultTaxonomy.SUBCATEGORY,
        status: BookmarkStatus.PENDING,
      })
    );
    expect(result.status).toBe(BookmarkStatus.PENDING);
  });
});
