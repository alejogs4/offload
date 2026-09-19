import { describe, it, expect, beforeEach } from "vitest";
import { DrizzleAdminRepository } from "../drizzle-admin-repository";
import { client } from "~/shared/infrastructure/db/client";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";

describe("DrizzleAdminRepository", () => {
  const repository = new DrizzleAdminRepository();
  const legacyUserId = "test-legacy-user";
  const targetUserId = "test-admin-target";

  beforeEach(async () => {
    // Ensure table exists and reset test rows
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
      sql: "DELETE FROM bookmarks WHERE user_id IN (?, ?)",
      args: [legacyUserId, targetUserId],
    });
  });

  it("should calculate aggregate volume and non-negative dbLatencyMs in getSystemStats", async () => {
    const now = Date.now();
    await client.execute({
      sql: `INSERT INTO bookmarks (id, user_id, url, title, description, category, subcategory, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "bm-stat-1",
        legacyUserId,
        "https://example.com/1",
        "Doc 1",
        "",
        "Tech",
        "Code",
        BookmarkStatus.PENDING,
        now,
        now,
      ],
    });

    await client.execute({
      sql: `INSERT INTO bookmarks (id, user_id, url, title, description, category, subcategory, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "bm-stat-2",
        legacyUserId,
        "https://example.com/2",
        "Doc 2",
        "",
        "Tech",
        "Code",
        BookmarkStatus.VISITED,
        now,
        now,
      ],
    });

    const stats = await repository.getSystemStats();
    expect(stats.totalBookmarks).toBeGreaterThanOrEqual(2);
    expect(stats.pendingCount).toBeGreaterThanOrEqual(1);
    expect(stats.visitedCount).toBeGreaterThanOrEqual(1);
    expect(stats.dbLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should get legacy migration status correctly", async () => {
    const now = Date.now();
    await client.execute({
      sql: `INSERT INTO bookmarks (id, user_id, url, title, description, category, subcategory, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "bm-mig-1",
        legacyUserId,
        "https://example.com/mig1",
        "Mig 1",
        "",
        "Tech",
        "Code",
        BookmarkStatus.PENDING,
        now,
        now,
      ],
    });

    const status = await repository.getLegacyMigrationStatus(legacyUserId);
    expect(status.legacyUserId).toBe(legacyUserId);
    expect(status.pendingCount).toBe(1);
  });

  it("should atomically reassign bookmarks from source to target user and support idempotent re-runs", async () => {
    const now = Date.now();
    await client.execute({
      sql: `INSERT INTO bookmarks (id, user_id, url, title, description, category, subcategory, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "bm-atom-1",
        legacyUserId,
        "https://example.com/a1",
        "Atom 1",
        "",
        "Tech",
        "Code",
        BookmarkStatus.PENDING,
        now,
        now,
      ],
    });

    await client.execute({
      sql: `INSERT INTO bookmarks (id, user_id, url, title, description, category, subcategory, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "bm-atom-2",
        legacyUserId,
        "https://example.com/a2",
        "Atom 2",
        "",
        "Tech",
        "Code",
        BookmarkStatus.VISITED,
        now,
        now,
      ],
    });

    // Initial migration execution
    const result1 = await repository.migrateLegacyBookmarks(
      legacyUserId,
      targetUserId
    );
    expect(result1.migratedCount).toBe(2);
    expect(result1.sourceUserId).toBe(legacyUserId);
    expect(result1.targetUserId).toBe(targetUserId);

    // Verify in database that legacyUserId has 0 bookmarks and targetUserId has 2
    const statusLegacyAfter = await repository.getLegacyMigrationStatus(legacyUserId);
    expect(statusLegacyAfter.pendingCount).toBe(0);

    const statusTargetAfter = await repository.getLegacyMigrationStatus(targetUserId);
    expect(statusTargetAfter.pendingCount).toBe(2);

    // Idempotent re-run should migrate 0 rows safely
    const result2 = await repository.migrateLegacyBookmarks(
      legacyUserId,
      targetUserId
    );
    expect(result2.migratedCount).toBe(0);
  });
});
