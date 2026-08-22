import { describe, it, expect, vi } from "vitest";
import { TelemetryBookmarkRepositoryDecorator } from "../telemetry-bookmark-repository-decorator";
import { BookmarkRepositoryPort } from "../../domain/bookmark-repository-port";
import { BookmarkState, BookmarkStatus } from "../../domain/bookmark-schema";
import { withServerTiming } from "~/shared/infrastructure/telemetry/server-timing";

const mockBookmark: BookmarkState = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "user-123",
  url: "https://example.com",
  title: "Example",
  description: "Test description",
  ogImage: undefined,
  category: "General",
  subcategory: "Reading",
  status: BookmarkStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TelemetryBookmarkRepositoryDecorator", () => {
  const createMockRepo = (): BookmarkRepositoryPort => ({
    findById: vi.fn().mockResolvedValue(mockBookmark),
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    markAsVisited: vi.fn().mockResolvedValue({
      ...mockBookmark,
      status: BookmarkStatus.VISITED,
    }),
    findAllByUserId: vi.fn().mockResolvedValue([mockBookmark]),
  });

  it("should transparently delegate calls without active timing context", async () => {
    const inner = createMockRepo();
    const decorator = new TelemetryBookmarkRepositoryDecorator(inner);

    const bookmark = await decorator.findById(mockBookmark.id);
    expect(bookmark).toEqual(mockBookmark);
    expect(inner.findById).toHaveBeenCalledWith(mockBookmark.id);

    await decorator.save(mockBookmark);
    expect(inner.save).toHaveBeenCalledWith(mockBookmark);

    await decorator.update(mockBookmark);
    expect(inner.update).toHaveBeenCalledWith(mockBookmark);

    const visited = await decorator.markAsVisited(mockBookmark.id, mockBookmark.userId);
    expect(visited.status).toBe(BookmarkStatus.VISITED);
    expect(inner.markAsVisited).toHaveBeenCalledWith(mockBookmark.id, mockBookmark.userId);

    const all = await decorator.findAllByUserId(mockBookmark.userId);
    expect(all).toHaveLength(1);
    expect(inner.findAllByUserId).toHaveBeenCalledWith(mockBookmark.userId);
  });

  it("should record database timing metrics in ServerTiming context for all operations", async () => {
    const inner = createMockRepo();
    const decorator = new TelemetryBookmarkRepositoryDecorator(inner);

    const { timing } = await withServerTiming(async () => {
      await decorator.findById(mockBookmark.id);
      await decorator.save(mockBookmark);
      await decorator.update(mockBookmark);
      await decorator.markAsVisited(mockBookmark.id, mockBookmark.userId);
      await decorator.findAllByUserId(mockBookmark.userId);
    });

    const header = timing.toHeader();
    expect(header).toContain("db_findById;dur=");
    expect(header).toContain("db_save;dur=");
    expect(header).toContain("db_update;dur=");
    expect(header).toContain("db_markAsVisited;dur=");
    expect(header).toContain("db_findAllByUserId;dur=");
    expect(header).toContain('desc="Turso SQL: findById"');
    expect(header).toContain('desc="Turso SQL: markAsVisited"');
  });
});
