import { describe, it, expect } from "vitest";
import { Bookmark } from "../bookmark";

describe("Bookmark Domain Entity", () => {
  it("should create a pending bookmark and update status to visited", () => {
    const bookmark = new Bookmark({
      id: "b-1",
      userId: "user-1",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
      category: "Uncategorized",
      subcategory: "General",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(bookmark.status).toBe("pending");

    bookmark.markAsVisited();

    expect(bookmark.status).toBe("visited");
  });

  it("should update category and subcategory", () => {
    const bookmark = new Bookmark({
      id: "b-2",
      userId: "user-1",
      url: "https://ai.google",
      title: "Google AI",
      description: "AI research",
      category: "Uncategorized",
      subcategory: "General",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    bookmark.categorize("Tech", "Artificial Intelligence");

    expect(bookmark.category).toBe("Tech");
    expect(bookmark.subcategory).toBe("Artificial Intelligence");
  });
});
