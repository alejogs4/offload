import { describe, it, expect, vi } from "vitest";
import { CreateBookmarkCommandHandler } from "../create-bookmark-command";
import { MarkBookmarkVisitedCommandHandler } from "../mark-bookmark-visited-command";
import { BookmarkState, BookmarkStatus } from "../../domain/bookmark-schema";

describe("Bookmark Application Command Handlers", () => {
  describe("CreateBookmarkCommandHandler", () => {
    it("should scrape metadata, save bookmark, and publish BookmarkCreatedEvent", async () => {
      const mockRepo = {
        findById: vi.fn(),
        save: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
        findAllByUserId: vi.fn(),
      };

      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          title: "Test Scraped Title",
          description: "Test Scraped Description",
        }),
      };

      const mockEventBus = {
        publish: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn(),
      };

      const handler = new CreateBookmarkCommandHandler(mockRepo, mockScraper, mockEventBus);
      const result = await handler.execute({
        userId: "user-123",
        url: "https://testing.com",
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe(BookmarkStatus.PENDING);
      expect(result.title).toBe("Test Scraped Title");
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          url: "https://testing.com",
          title: "Test Scraped Title",
          status: BookmarkStatus.PENDING,
        })
      );
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

      expect(mockRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "123e4567-e89b-12d3-a456-426614174000",
          status: BookmarkStatus.VISITED,
        })
      );
      expect(mockEventBus.publish).toHaveBeenCalledOnce();
    });
  });
});
