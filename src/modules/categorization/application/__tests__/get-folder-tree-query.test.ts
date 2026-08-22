import { describe, it, expect, vi } from "vitest";
import { GetFolderTreeQueryHandler } from "../get-folder-tree-query";
import { BookmarkState, BookmarkStatus } from "~/modules/bookmark/domain/bookmark-schema";

describe("GetFolderTreeQueryHandler", () => {
  it("should separate processing, pending, and visited bookmarks and group pending into folder tree", async () => {
    const now = new Date();
    const mockBookmarks: BookmarkState[] = [
      {
        id: "b-1",
        userId: "user-1",
        url: "https://example.com/processing-1",
        title: "Processing 1",
        description: "",
        category: "Uncategorized",
        subcategory: "General",
        status: BookmarkStatus.PROCESSING,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "b-2",
        userId: "user-1",
        url: "https://example.com/pending-tech-ts",
        title: "TypeScript Deep Dive",
        description: "TS guide",
        category: "Tech",
        subcategory: "TypeScript",
        status: BookmarkStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "b-3",
        userId: "user-1",
        url: "https://example.com/pending-tech-react",
        title: "React 19",
        description: "React guide",
        category: "Tech",
        subcategory: "React",
        status: BookmarkStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "b-4",
        userId: "user-1",
        url: "https://example.com/visited-1",
        title: "Visited Article",
        description: "Done",
        category: "Tech",
        subcategory: "General",
        status: BookmarkStatus.VISITED,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      findAllByUserId: vi.fn().mockResolvedValue(mockBookmarks),
      markAsVisited: vi.fn(),
    };

    const handler = new GetFolderTreeQueryHandler(mockRepo);
    const result = await handler.execute("user-1");

    expect(result.processingBookmarks).toHaveLength(1);
    expect(result.processingBookmarks[0].id).toBe("b-1");
    expect(result.processingBookmarks[0].status).toBe(BookmarkStatus.PROCESSING);

    expect(result.visitedBookmarks).toHaveLength(1);
    expect(result.visitedBookmarks[0].id).toBe("b-4");

    expect(result.pendingFolders).toHaveLength(1);
    expect(result.pendingFolders[0].name).toBe("Tech");
    expect(result.pendingFolders[0].subcategories).toHaveLength(2);
  });
});
