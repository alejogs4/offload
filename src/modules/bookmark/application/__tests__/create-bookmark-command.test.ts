import { describe, it, expect, vi } from "vitest";
import { CreateBookmarkCommandHandler } from "../create-bookmark-command";
import { Bookmark } from "../../domain/bookmark";

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

    expect(result).toBeInstanceOf(Bookmark);
    expect(result.title).toBe("Test Scraped Title");
    expect(mockRepo.save).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
  });
});
