import { describe, it, expect, vi } from "vitest";
import { MarkBookmarkVisitedCommandHandler } from "../mark-bookmark-visited-command";
import { BookmarkRepositoryPort } from "../../domain/bookmark-repository-port";
import { BookmarkState, BookmarkStatus } from "../../domain/bookmark-schema";
import { BookmarkVisitedEvent } from "../../domain/bookmark-events";
import { EventBusPort } from "~/shared/domain/domain-event";

const mockBookmark: BookmarkState = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "user-456",
  url: "https://example.com/article",
  title: "Article",
  description: "Test description",
  ogImage: undefined,
  category: "General",
  subcategory: "Reading",
  status: BookmarkStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("MarkBookmarkVisitedCommandHandler", () => {
  it("should perform atomic markAsVisited in a single call and publish BookmarkVisitedEvent", async () => {
    const repository: BookmarkRepositoryPort = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      markAsVisited: vi.fn().mockResolvedValue({
        ...mockBookmark,
        status: BookmarkStatus.VISITED,
      }),
      findAllByUserId: vi.fn(),
    };

    const eventBus: EventBusPort = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };

    const handler = new MarkBookmarkVisitedCommandHandler(repository, eventBus);

    await handler.execute({
      bookmarkId: mockBookmark.id,
      userId: mockBookmark.userId,
    });

    // Verify single-trip atomic update
    expect(repository.markAsVisited).toHaveBeenCalledTimes(1);
    expect(repository.markAsVisited).toHaveBeenCalledWith(mockBookmark.id, mockBookmark.userId);

    // Verify findById and update were NOT called (waterfall eliminated)
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();

    // Verify event bus published BookmarkVisitedEvent
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = (eventBus.publish as any).mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(BookmarkVisitedEvent);
    expect(publishedEvent.payload).toEqual({
      bookmarkId: mockBookmark.id,
      userId: mockBookmark.userId,
    });
  });

  it("should fail validation if bookmarkId is not a valid UUID", async () => {
    const repository: BookmarkRepositoryPort = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      markAsVisited: vi.fn(),
      findAllByUserId: vi.fn(),
    };
    const eventBus: EventBusPort = {
      publish: vi.fn(),
      subscribe: vi.fn(),
    };

    const handler = new MarkBookmarkVisitedCommandHandler(repository, eventBus);

    await expect(
      handler.execute({
        bookmarkId: "not-a-uuid",
        userId: "user-456",
      })
    ).rejects.toThrow();

    expect(repository.markAsVisited).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("should not publish domain event if repository throws an error", async () => {
    const repository: BookmarkRepositoryPort = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      markAsVisited: vi.fn().mockRejectedValue(new Error("Bookmark not found or unauthorized")),
      findAllByUserId: vi.fn(),
    };
    const eventBus: EventBusPort = {
      publish: vi.fn(),
      subscribe: vi.fn(),
    };

    const handler = new MarkBookmarkVisitedCommandHandler(repository, eventBus);

    await expect(
      handler.execute({
        bookmarkId: mockBookmark.id,
        userId: mockBookmark.userId,
      })
    ).rejects.toThrow("Bookmark not found or unauthorized");

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
