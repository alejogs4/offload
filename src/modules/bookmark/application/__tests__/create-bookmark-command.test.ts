import { describe, it, expect, vi } from "vitest";
import { CreateBookmarkCommandHandler } from "../create-bookmark-command";
import { MarkBookmarkVisitedCommandHandler } from "../mark-bookmark-visited-command";
import { BookmarkState, BookmarkStatus } from "../../domain/bookmark-schema";
import { BookmarkEnrichmentService } from "../../domain/services/bookmark-enrichment-service";

describe("Bookmark Application Command Handlers", () => {
  describe("CreateBookmarkCommandHandler", () => {
    it("should immediately save bookmark with PROCESSING status, emit event, and dispatch background enrichment", async () => {
      const mockRepo = {
        findById: vi.fn(),
        save: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
        findAllByUserId: vi.fn(),
      };

      const mockEnrichmentService = {
        enrich: vi.fn().mockResolvedValue(undefined),
      } as unknown as BookmarkEnrichmentService;

      const mockEventBus = {
        publish: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn(),
      };

      const handler = new CreateBookmarkCommandHandler(mockRepo, mockEnrichmentService, mockEventBus);
      const result = await handler.execute({
        userId: "user-123",
        url: "https://testing.com/articles/async-pipeline",
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe(BookmarkStatus.PROCESSING);
      expect(result.title).toBe("testing.com");
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          url: "https://testing.com/articles/async-pipeline",
          title: "testing.com",
          status: BookmarkStatus.PROCESSING,
        })
      );
      expect(mockEnrichmentService.enrich).toHaveBeenCalledWith(result);
      expect(mockEventBus.publish).toHaveBeenCalledOnce();
    });
  });

  describe("MarkBookmarkVisitedCommandHandler", () => {
    it("should validate ownership, update bookmark status to visited, and publish event", async () => {
      const existingBookmark: BookmarkState = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "user-123",
        url: "https://testing.com",
        title: "Test Bookmark",
        description: "Desc",
        category: "General",
        subcategory: "Misc",
        status: BookmarkStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRepo = {
        findById: vi.fn().mockResolvedValue(existingBookmark),
        save: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        markAsVisited: vi.fn().mockResolvedValue({
          ...existingBookmark,
          status: BookmarkStatus.VISITED,
        }),
        findAllByUserId: vi.fn(),
      };

      const mockEventBus = {
        publish: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn(),
      };

      const handler = new MarkBookmarkVisitedCommandHandler(mockRepo, mockEventBus);
      await handler.execute({
        userId: "user-123",
        bookmarkId: "123e4567-e89b-12d3-a456-426614174000",
      });

      expect(mockRepo.markAsVisited).toHaveBeenCalledWith(
        "123e4567-e89b-12d3-a456-426614174000",
        "user-123"
      );
      expect(mockEventBus.publish).toHaveBeenCalledOnce();
    });
  });
});
