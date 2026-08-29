import { describe, it, expect, beforeEach } from "vitest";
import { DrizzleBookmarkRepository } from "../drizzle-bookmark-repository";
import { BookmarkState, BookmarkStatus } from "../../domain/bookmark-schema";
import { client, db } from "~/shared/infrastructure/db/client";
import { user } from "~/shared/infrastructure/db/schema";
import { eq } from "drizzle-orm";

describe("Multi-Tenant Data Isolation", () => {
  const repository = new DrizzleBookmarkRepository();
  const userA = "tenant-user-alpha";
  const userB = "tenant-user-beta";

  beforeEach(async () => {
    // Ensure tables exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
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

    // Clean up test data
    await client.execute({
      sql: "DELETE FROM bookmarks WHERE user_id IN (?, ?)",
      args: [userA, userB],
    });
    await db.delete(user).where(eq(user.id, userA)).catch(() => {});
    await db.delete(user).where(eq(user.id, userB)).catch(() => {});

    // Seed test users
    const now = new Date();
    await db.insert(user).values([
      {
        id: userA,
        name: "User Alpha",
        email: "alpha@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: userB,
        name: "User Beta",
        email: "beta@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  it("should strictly isolate bookmark queries between different tenants", async () => {
    const bookmarkA: BookmarkState = {
      id: "11111111-1111-4111-8111-111111111111",
      userId: userA,
      url: "https://alpha.example.com/doc",
      title: "Alpha Private Document",
      description: "Confidential to Alpha",
      ogImage: undefined,
      category: "Work",
      subcategory: "Confidential",
      status: BookmarkStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const bookmarkB: BookmarkState = {
      id: "22222222-2222-4222-8222-222222222222",
      userId: userB,
      url: "https://beta.example.com/doc",
      title: "Beta Private Document",
      description: "Confidential to Beta",
      ogImage: undefined,
      category: "Personal",
      subcategory: "Finance",
      status: BookmarkStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.save(bookmarkA);
    await repository.save(bookmarkB);

    // User A should only see bookmark A
    const listA = await repository.findAllByUserId(userA);
    expect(listA).toHaveLength(1);
    expect(listA[0].id).toBe(bookmarkA.id);
    expect(listA[0].title).toBe("Alpha Private Document");

    // User B should only see bookmark B
    const listB = await repository.findAllByUserId(userB);
    expect(listB).toHaveLength(1);
    expect(listB[0].id).toBe(bookmarkB.id);
    expect(listB[0].title).toBe("Beta Private Document");
  });

  it("should prevent User B from mutating or marking visited User A's bookmark", async () => {
    const bookmarkA: BookmarkState = {
      id: "77777777-7777-4777-8777-777777777777",
      userId: userA,
      url: "https://alpha.example.com/task",
      title: "Alpha Task",
      description: "Do not touch",
      ogImage: undefined,
      category: "Work",
      subcategory: "Tasks",
      status: BookmarkStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.save(bookmarkA);

    // User B attempts to mark User A's bookmark as visited
    await expect(repository.markAsVisited(bookmarkA.id, userB)).rejects.toThrow(
      "Bookmark not found or unauthorized"
    );

    // User A's bookmark must remain PENDING
    const fetched = await repository.findById(bookmarkA.id);
    expect(fetched?.status).toBe(BookmarkStatus.PENDING);

    // User A can successfully mark it visited
    const updated = await repository.markAsVisited(bookmarkA.id, userA);
    expect(updated.status).toBe(BookmarkStatus.VISITED);
  });
});
