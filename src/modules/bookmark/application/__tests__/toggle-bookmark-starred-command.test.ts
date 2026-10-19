import { describe, it, expect, vi } from "vitest";
import { ToggleBookmarkStarredCommandHandler } from "../toggle-bookmark-starred-command";
import { BookmarkRepositoryPort } from "../../domain/bookmark-repository-port";
import { BookmarkState, BookmarkStatus } from "../../domain/bookmark-schema";
import { BookmarkStarredToggledEvent } from "../../domain/bookmark-events";
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
  isStarred: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ToggleBookmarkStarredCommandHandler", () => {
  it("should perform atomic toggleStarred in a single call and publish BookmarkStarredToggledEvent", async () => {
    const repository: BookmarkRepositoryPort = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      markAsVisited: vi.fn(),
      toggleStarred: vi.fn().mockResolvedValue({
        ...mockBookmark,
        isStarred: true,
      }),
      findAllByUserId: vi.fn(),
    };

    const eventBus: EventBusPort = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };

    const handler = new ToggleBookmarkStarredCommandHandler(repository, eventBus);

    await handler.execute({
      bookmarkId: mockBookmark.id,
      userId: mockBookmark.userId,
      isStarred: true,
    });

    expect(repository.toggleStarred).toHaveBeenCalledTimes(1);
    expect(repository.toggleStarred).toHaveBeenCalledWith(
      mockBookmark.id,
      mockBookmark.userId,
      true
    );

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = (eventBus.publish as any).mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(BookmarkStarredToggledEvent);
    expect(publishedEvent.payload).toEqual({
      bookmarkId: mockBookmark.id,
      userId: mockBookmark.userId,
      isStarred: true,
    });
  });

  it("should fail validation if bookmarkId is not a valid UUID", async () => {
    const repository: BookmarkRepositoryPort = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      markAsVisited: vi.fn(),
      toggleStarred: vi.fn(),
      findAllByUserId: vi.fn(),
    };
    const eventBus: EventBusPort = {
      publish: vi.fn(),
      subscribe: vi.fn(),
    };

    const handler = new ToggleBookmarkStarredCommandHandler(repository, eventBus);

    await expect(
      handler.execute({
        bookmarkId: "invalid-uuid",
        userId: "user-456",
        isStarred: true,
      })
    ).rejects.toThrow();

    expect(repository.toggleStarred).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
