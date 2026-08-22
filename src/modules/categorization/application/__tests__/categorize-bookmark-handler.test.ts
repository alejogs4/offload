import { describe, it, expect, vi } from "vitest";
import { CategorizeBookmarkHandler } from "../categorize-bookmark-handler";
import { BookmarkCreatedEvent } from "~/modules/bookmark/domain/bookmark-events";
import {
  BookmarkState,
  BookmarkStatus,
  DefaultTaxonomy,
} from "~/modules/bookmark/domain/bookmark-schema";

describe("CategorizeBookmarkHandler", () => {
  it("should categorize existing bookmark and emit BookmarkCategorizedEvent", async () => {
    const existingState: BookmarkState = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "u-1",
      url: "https://react.dev",
      title: "React Documentation",
      description: "Learn React",
      category: DefaultTaxonomy.CATEGORY,
      subcategory: DefaultTaxonomy.SUBCATEGORY,
      status: BookmarkStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(existingState),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      findAllByUserId: vi.fn(),
      markAsVisited: vi.fn(),
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
      bookmarkId: "123e4567-e89b-12d3-a456-426614174000",
      userId: "u-1",
      url: "https://react.dev",
      title: "React Documentation",
      description: "Learn React",
    });

    await handler.handle(event);

    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "123e4567-e89b-12d3-a456-426614174000",
        category: "Tech",
        subcategory: "Frontend",
      })
    );
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
  });
});
