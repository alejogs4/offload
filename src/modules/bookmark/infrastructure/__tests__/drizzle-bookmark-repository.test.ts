import { describe, it, expect, beforeEach } from "vitest";
import { DrizzleBookmarkRepository } from "../drizzle-bookmark-repository";
import { BookmarkState, BookmarkStatus } from "../../domain/bookmark-schema";
import { client } from "~/shared/infrastructure/db/client";

describe("DrizzleBookmarkRepository", () => {
  const repository = new DrizzleBookmarkRepository();
  const userId = "test-user-drizzle";

  beforeEach(async () => {
    // Ensure table exists and clear test data
    await client.execute(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        og_image TEXT,
        category TEXT NOT NULL DEFAULT 'General',
        subcategory TEXT NOT NULL DEFAULT 'Reading',
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    await client.execute({
      sql: "DELETE FROM bookmarks WHERE user_id = ?",
      args: [userId],
    });
  });

  it("should atomically mark a pending bookmark as visited using RETURNING *", async () => {
    const bookmark: BookmarkState = {
      id: "33333333-3333-4333-8333-333333333333",
      userId,
      url: "https://example.com/atomic",
      title: "Atomic SQL Test",
      description: "Testing single-trip update",
      ogImage: undefined,
      category: "Engineering",
      subcategory: "Database",
      status: BookmarkStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.save(bookmark);

    const updated = await repository.markAsVisited(bookmark.id, userId);
    expect(updated.id).toBe(bookmark.id);
    expect(updated.status).toBe(BookmarkStatus.VISITED);
    expect(updated.title).toBe(bookmark.title);

    // Verify persisted in database
    const fetched = await repository.findById(bookmark.id);
    expect(fetched?.status).toBe(BookmarkStatus.VISITED);
  });

  it("should throw an error when marking a non-existent or unauthorized bookmark", async () => {
    await expect(
      repository.markAsVisited("44444444-4444-4444-8444-444444444444", userId)
    ).rejects.toThrow("Bookmark not found or unauthorized");
  });
});
