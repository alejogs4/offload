import { describe, it, expect, vi } from "vitest";
import { CategorizeBookmarkHandler } from "../categorize-bookmark-handler";
import { BookmarkCreatedEvent } from "~/modules/bookmark/domain/bookmark-events";
import { Bookmark } from "~/modules/bookmark/domain/bookmark";

describe("CategorizeBookmarkHandler", () => {
  it("should categorize existing bookmark and emit BookmarkCategorizedEvent", async () => {
    const existingBookmark = new Bookmark({
      id: "b-100",
      userId: "u-1",
      url: "https://react.dev",
      title: "React Documentation",
      description: "Learn React",
      category: "Uncategorized",
      subcategory: "General",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(existingBookmark),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      findAllByUserId: vi.fn(),
    };

    const mockCategorizer = {
      categorize: vi.fn().mockResolvedValue({
        category: "Tech",
        subcategory: "Frontend",
      }),
    };

    const mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };

    const handler = new CategorizeBookmarkHandler(mockRepo, mockCategorizer, mockEventBus);
    const event = new BookmarkCreatedEvent({
      bookmarkId: "b-100",
      userId: "u-1",
      url: "https://react.dev",
      title: "React Documentation",
      description: "Learn React",
    });

    await handler.handle(event);

    expect(existingBookmark.category).toBe("Tech");
    expect(existingBookmark.subcategory).toBe("Frontend");
    expect(mockRepo.update).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
  });
});
