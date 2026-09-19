import { describe, it, expect, vi } from "vitest";
import { MigrateLegacyBookmarksCommandHandler } from "../migrate-legacy-bookmarks-command";
import type { AdminRepositoryPort } from "../../domain/admin-repository-port";

describe("MigrateLegacyBookmarksCommandHandler", () => {
  const mockAdminRepo: AdminRepositoryPort = {
    getSystemStats: vi.fn(),
    getLegacyMigrationStatus: vi.fn(),
    migrateLegacyBookmarks: vi.fn(),
  };

  const handler = new MigrateLegacyBookmarksCommandHandler(mockAdminRepo);

  it("should validate input and execute migration with default source user", async () => {
    const executedAt = new Date();
    vi.mocked(mockAdminRepo.migrateLegacyBookmarks).mockResolvedValueOnce({
      sourceUserId: "local-user-1",
      targetUserId: "target-admin-456",
      migratedCount: 5,
      executedAt,
    });

    const result = await handler.execute({
      targetUserId: "target-admin-456",
    });

    expect(mockAdminRepo.migrateLegacyBookmarks).toHaveBeenCalledWith(
      "local-user-1",
      "target-admin-456"
    );
    expect(result.migratedCount).toBe(5);
    expect(result.targetUserId).toBe("target-admin-456");
  });

  it("should allow custom source user id", async () => {
    const executedAt = new Date();
    vi.mocked(mockAdminRepo.migrateLegacyBookmarks).mockResolvedValueOnce({
      sourceUserId: "custom-legacy-user",
      targetUserId: "target-admin-456",
      migratedCount: 2,
      executedAt,
    });

    const result = await handler.execute({
      sourceUserId: "custom-legacy-user",
      targetUserId: "target-admin-456",
    });

    expect(mockAdminRepo.migrateLegacyBookmarks).toHaveBeenCalledWith(
      "custom-legacy-user",
      "target-admin-456"
    );
    expect(result.migratedCount).toBe(2);
  });

  it("should fail validation if targetUserId is empty", async () => {
    await expect(
      handler.execute({
        targetUserId: "",
      })
    ).rejects.toThrow();
  });
});
