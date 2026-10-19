import { describe, it, expect, vi } from "vitest";
import { GetFolderTreeQueryHandler, STARRED_CATEGORY_NAME } from "../get-folder-tree-query";
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
        isStarred: false,
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
        isStarred: false,
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
        isStarred: false,
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
        isStarred: false,
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
      toggleStarred: vi.fn(),
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

  it("should pin Starred category at index 0 with no nested subcategories and avoid duplicating starred items in regular categories", async () => {
    const now = new Date();
    const mockBookmarks: BookmarkState[] = [
      {
        id: "b-regular",
        userId: "user-1",
        url: "https://example.com/regular",
        title: "Regular Article",
        description: "In Tech/Frontend",
        category: "Tech",
        subcategory: "Frontend",
        status: BookmarkStatus.PENDING,
        isStarred: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "b-starred-1",
        userId: "user-1",
        url: "https://example.com/starred-1",
        title: "Starred Tech Article",
        description: "Originally Tech/Backend",
        category: "Tech",
        subcategory: "Backend",
        status: BookmarkStatus.PENDING,
        isStarred: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "b-starred-2",
        userId: "user-1",
        url: "https://example.com/starred-2",
        title: "Starred Design Article",
        description: "Originally Design/UI",
        category: "Design",
        subcategory: "UI",
        status: BookmarkStatus.PENDING,
        isStarred: true,
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
      toggleStarred: vi.fn(),
    };

    const handler = new GetFolderTreeQueryHandler(mockRepo);
    const result = await handler.execute("user-1");

    expect(result.pendingFolders).toHaveLength(2);
    // Index 0 must be "Starred" and flat (single group with empty subcategory name)
    expect(result.pendingFolders[0].name).toBe(STARRED_CATEGORY_NAME);
    expect(result.pendingFolders[0].isFlat).toBe(true);
    expect(result.pendingFolders[0].subcategories).toHaveLength(1);
    expect(result.pendingFolders[0].subcategories[0].name).toBe("");
    expect(result.pendingFolders[0].subcategories[0].bookmarks.map((b) => b.id)).toEqual([
      "b-starred-1",
      "b-starred-2",
    ]);
    // Original category/subcategory preserved on DTO for unstar restoration
    expect(result.pendingFolders[0].subcategories[0].bookmarks[0].category).toBe("Tech");
    expect(result.pendingFolders[0].subcategories[0].bookmarks[0].subcategory).toBe("Backend");

    // Index 1 is "Tech" containing only the unstarred item ("Design" is omitted since its only item is starred)
    expect(result.pendingFolders[1].name).toBe("Tech");
    expect(result.pendingFolders[1].subcategories).toHaveLength(1);
    expect(result.pendingFolders[1].subcategories[0].name).toBe("Frontend");
    expect(result.pendingFolders[1].subcategories[0].bookmarks.map((b) => b.id)).toEqual([
      "b-regular",
    ]);
  });
});
