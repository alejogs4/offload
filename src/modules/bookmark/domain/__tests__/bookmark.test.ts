import { describe, it, expect } from "vitest";
import { Bookmark } from "../bookmark";
import {
  BookmarkState,
  BookmarkStateSchema,
  BookmarkStatus,
  DefaultTaxonomy,
} from "../bookmark-schema";

describe("Bookmark Aggregate & Domain Invariants", () => {
  const bookmark = new Bookmark();

  it("should create a valid pending bookmark and generate BookmarkCreated event", () => {
    const { event, evolved } = bookmark.create({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
      category: "Tech",
      subcategory: "TypeScript",
    });

    expect(event.type).toBe("BookmarkCreated");
    expect(evolved.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(evolved.status).toBe(BookmarkStatus.PENDING);
    expect(evolved.category).toBe("Tech");
    expect(evolved.subcategory).toBe("TypeScript");
  });

  it("should reject creation with invalid URL format", () => {
    expect(() => {
      bookmark.create({
        userId: "user-1",
        url: "invalid-url",
        title: "Bad URL",
        description: "Desc",
      });
    }).toThrow();
  });

  it("should mark a pending bookmark as visited and produce BookmarkVisited event", () => {
    const { evolved: initialState } = bookmark.create({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
    });

    const { event, evolved } = bookmark.markAsVisited(initialState, "user-1");

    expect(event.type).toBe("BookmarkVisited");
    expect(evolved.status).toBe(BookmarkStatus.VISITED);
    expect(evolved.updatedAt.getTime()).toBeGreaterThanOrEqual(initialState.updatedAt.getTime());
  });

  it("should throw error if unauthorized user tries to mark bookmark as visited", () => {
    const { evolved: state } = bookmark.create({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "owner-user",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
    });

    expect(() => {
      bookmark.markAsVisited(state, "attacker-user");
    }).toThrow(/Unauthorized/);
  });

  it("should throw error if attempting to mark an already visited bookmark as visited", () => {
    const { evolved: state } = bookmark.create({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
    });

    const { evolved: visitedState } = bookmark.markAsVisited(state, "user-1");

    expect(() => {
      bookmark.markAsVisited(visitedState, "user-1");
    }).toThrow(/already marked as visited/);
  });

  it("should categorize bookmark and produce BookmarkCategorized event", () => {
    const { evolved: state } = bookmark.create({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://ai.google",
      title: "Google AI",
      description: "AI research",
    });

    const { event, evolved } = bookmark.categorize(state, "AI", "Machine Learning");

    expect(event.type).toBe("BookmarkCategorized");
    expect(evolved.category).toBe("AI");
    expect(evolved.subcategory).toBe("Machine Learning");
  });

  it("should reject categorization with empty category", () => {
    const { evolved: state } = bookmark.create({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://ai.google",
      title: "Google AI",
      description: "AI research",
    });

    expect(() => {
      bookmark.categorize(state, "   ", "Sub");
    }).toThrow(/Category cannot be empty/);
  });

  it("should default category and subcategory to taxonomy defaults when omitted", () => {
    const { evolved: state } = bookmark.create({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
    });

    expect(state.category).toBe(DefaultTaxonomy.CATEGORY);
    expect(state.subcategory).toBe(DefaultTaxonomy.SUBCATEGORY);
    expect(state.status).toBe(BookmarkStatus.PENDING);
  });

  it("should handle empty string, null, or relative ogImage without crashing", () => {
    const fromDbWithEmptyOg = BookmarkStateSchema.parse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
      ogImage: "",
      category: "Tech",
      subcategory: "General",
      status: BookmarkStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(fromDbWithEmptyOg.ogImage).toBeUndefined();

    const fromDbWithRelativeOg = BookmarkStateSchema.parse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      url: "https://example.com",
      title: "Example Title",
      description: "Example Description",
      ogImage: "/assets/banner.png",
      category: "Tech",
      subcategory: "General",
      status: BookmarkStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(fromDbWithRelativeOg.ogImage).toBe("/assets/banner.png");
  });
});
