import { describe, it, expect } from "vitest";
import {
  normalizeText,
  matchesBookmarkText,
  filterPendingFolders,
  filterVisitedBookmarks,
  countPendingBookmarks,
  extractTopLevelCategories,
} from "../bookmark-filters";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-schema";
import type { CategoryGroupDTO, BookmarkItemDTO } from "~/modules/categorization/application/get-folder-tree-query";

describe("bookmark-filters", () => {
  describe("normalizeText", () => {
    it("should lowercase, trim and remove accents/diacritics", () => {
      expect(normalizeText("  TÉCNICO & Programación  ")).toBe("tecnico & programacion");
      expect(normalizeText("")).toBe("");
      expect(normalizeText(null as any)).toBe("");
    });
  });

  describe("matchesBookmarkText", () => {
    const sampleBookmark: BookmarkItemDTO = {
      id: "b-1",
      title: "React 19 Server Actions Guide",
      description: "Comprehensive tutorial on fullstack React patterns",
      url: "https://react.dev/reference/rsc",
      category: "Development",
      subcategory: "React",
      status: BookmarkStatus.PENDING,
      createdAt: "2026-01-01T00:00:00Z",
    };

    it("should return true for empty query", () => {
      expect(matchesBookmarkText(sampleBookmark, "")).toBe(true);
      expect(matchesBookmarkText(sampleBookmark, "   ")).toBe(true);
    });

    it("should match against title case-insensitively and accent-insensitively", () => {
      expect(matchesBookmarkText(sampleBookmark, "server actions")).toBe(true);
      expect(matchesBookmarkText(sampleBookmark, "react 19")).toBe(true);
      expect(matchesBookmarkText(sampleBookmark, "vue")).toBe(false);
    });

    it("should match against description", () => {
      expect(matchesBookmarkText(sampleBookmark, "fullstack")).toBe(true);
      expect(matchesBookmarkText(sampleBookmark, "tutorial")).toBe(true);
    });

    it("should match against url / domain", () => {
      expect(matchesBookmarkText(sampleBookmark, "react.dev")).toBe(true);
      expect(matchesBookmarkText(sampleBookmark, "/reference/rsc")).toBe(true);
    });
  });

  describe("filterPendingFolders", () => {
    const sampleFolders: CategoryGroupDTO[] = [
      {
        name: "Tech",
        subcategories: [
          {
            name: "Frontend",
            bookmarks: [
              {
                id: "1",
                title: "Vite Docs",
                description: "Next Generation Frontend Tooling",
                url: "https://vite.dev",
                category: "Tech",
                subcategory: "Frontend",
                status: BookmarkStatus.PENDING,
                createdAt: "2026-01-01",
              },
              {
                id: "2",
                title: "React Docs",
                description: "The library for web and native UIs",
                url: "https://react.dev",
                category: "Tech",
                subcategory: "Frontend",
                status: BookmarkStatus.PENDING,
                createdAt: "2026-01-01",
              },
            ],
          },
          {
            name: "Backend",
            bookmarks: [
              {
                id: "3",
                title: "Drizzle ORM",
                description: "TypeScript ORM that feels like SQL",
                url: "https://orm.drizzle.team",
                category: "Tech",
                subcategory: "Backend",
                status: BookmarkStatus.PENDING,
                createdAt: "2026-01-01",
              },
            ],
          },
        ],
      },
      {
        name: "Design",
        subcategories: [
          {
            name: "Inspiration",
            bookmarks: [
              {
                id: "4",
                title: "Mobbin",
                description: "Discover real-world UI design patterns",
                url: "https://mobbin.com",
                category: "Design",
                subcategory: "Inspiration",
                status: BookmarkStatus.PENDING,
                createdAt: "2026-01-01",
              },
            ],
          },
        ],
      },
    ];

    it("should return all folders if no filters are applied", () => {
      const result = filterPendingFolders(sampleFolders, {});
      expect(result).toHaveLength(2);
      expect(countPendingBookmarks(result)).toBe(4);
    });

    it("should filter by top-level category only", () => {
      const result = filterPendingFolders(sampleFolders, { category: "Design" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Design");
      expect(result[0].subcategories[0].bookmarks).toHaveLength(1);
    });

    it("should filter by search query across folders and prune empty subcategories/categories", () => {
      const result = filterPendingFolders(sampleFolders, { query: "Drizzle" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Tech");
      expect(result[0].subcategories).toHaveLength(1);
      expect(result[0].subcategories[0].name).toBe("Backend");
      expect(result[0].subcategories[0].bookmarks[0].title).toBe("Drizzle ORM");
    });

    it("should filter by both category and search query", () => {
      const result = filterPendingFolders(sampleFolders, { category: "Tech", query: "Vite" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Tech");
      expect(result[0].subcategories[0].bookmarks).toHaveLength(1);
      expect(result[0].subcategories[0].bookmarks[0].title).toBe("Vite Docs");

      const noMatchResult = filterPendingFolders(sampleFolders, { category: "Design", query: "Vite" });
      expect(noMatchResult).toHaveLength(0);
    });
  });

  describe("filterVisitedBookmarks", () => {
    const visitedBookmarks: BookmarkItemDTO[] = [
      {
        id: "v1",
        title: "How TypeScript Works",
        description: "Deep dive into compiler internals",
        url: "https://typescriptlang.org",
        category: "Tech",
        subcategory: "Languages",
        status: BookmarkStatus.VISITED,
        createdAt: "2026-01-01",
      },
      {
        id: "v2",
        title: "Product Design Systems",
        description: "Building scalable UI tokens",
        url: "https://designsystems.io",
        category: "Design",
        subcategory: "Design Systems",
        status: BookmarkStatus.VISITED,
        createdAt: "2026-01-01",
      },
    ];

    it("should filter visited bookmarks by category and query", () => {
      const techOnly = filterVisitedBookmarks(visitedBookmarks, { category: "Tech" });
      expect(techOnly).toHaveLength(1);
      expect(techOnly[0].id).toBe("v1");

      const queryOnly = filterVisitedBookmarks(visitedBookmarks, { query: "tokens" });
      expect(queryOnly).toHaveLength(1);
      expect(queryOnly[0].id).toBe("v2");
    });
  });

  describe("extractTopLevelCategories", () => {
    it("should extract unique sorted categories from pending folders", () => {
      const pending: CategoryGroupDTO[] = [
        { name: "Tech", subcategories: [] },
        { name: "Design", subcategories: [] },
        { name: "Tech", subcategories: [] },
      ];
      const categories = extractTopLevelCategories(pending, [], BookmarkStatus.PENDING);
      expect(categories).toEqual(["Design", "Tech"]);
    });

    it("should extract unique sorted categories from visited bookmarks", () => {
      const visited: BookmarkItemDTO[] = [
        { id: "1", title: "A", description: "", url: "", category: "Product", subcategory: "", status: BookmarkStatus.VISITED, createdAt: "" },
        { id: "2", title: "B", description: "", url: "", category: "Architecture", subcategory: "", status: BookmarkStatus.VISITED, createdAt: "" },
        { id: "3", title: "C", description: "", url: "", category: "Product", subcategory: "", status: BookmarkStatus.VISITED, createdAt: "" },
      ];
      const categories = extractTopLevelCategories([], visited, BookmarkStatus.VISITED);
      expect(categories).toEqual(["Architecture", "Product"]);
    });
  });
});
