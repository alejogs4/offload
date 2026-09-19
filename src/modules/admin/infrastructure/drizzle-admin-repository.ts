import { count, eq, sql } from "drizzle-orm";
import { db } from "~/shared/infrastructure/db/client";
import { bookmarksTable } from "~/shared/infrastructure/db/schema";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";
import {
  AdminRepositoryPort,
  SystemStats,
  LegacyMigrationStatus,
  MigrationExecutionResult,
} from "../domain/admin-repository-port";

export class DrizzleAdminRepository implements AdminRepositoryPort {
  constructor(private readonly database = db) {}

  async getSystemStats(): Promise<SystemStats> {
    const start = performance.now();

    const [statsRow] = await this.database
      .select({
        total: count(),
        pending: count(
          sql`CASE WHEN ${bookmarksTable.status} = ${BookmarkStatus.PENDING} THEN 1 END`
        ),
        visited: count(
          sql`CASE WHEN ${bookmarksTable.status} = ${BookmarkStatus.VISITED} THEN 1 END`
        ),
        processing: count(
          sql`CASE WHEN ${bookmarksTable.status} = ${BookmarkStatus.PROCESSING} THEN 1 END`
        ),
        failed: count(
          sql`CASE WHEN ${bookmarksTable.status} = ${BookmarkStatus.FAILED} THEN 1 END`
        ),
      })
      .from(bookmarksTable);

    const dbLatencyMs = Number((performance.now() - start).toFixed(2));

    return {
      totalBookmarks: Number(statsRow?.total ?? 0),
      pendingCount: Number(statsRow?.pending ?? 0),
      visitedCount: Number(statsRow?.visited ?? 0),
      processingCount: Number(statsRow?.processing ?? 0),
      failedCount: Number(statsRow?.failed ?? 0),
      dbLatencyMs,
    };
  }

  async getLegacyMigrationStatus(
    legacyUserId = "local-user-1"
  ): Promise<LegacyMigrationStatus> {
    const [result] = await this.database
      .select({ count: count() })
      .from(bookmarksTable)
      .where(eq(bookmarksTable.userId, legacyUserId));

    return {
      legacyUserId,
      pendingCount: Number(result?.count ?? 0),
      lastMigratedAt: null,
    };
  }

  async migrateLegacyBookmarks(
    sourceUserId: string,
    targetUserId: string
  ): Promise<MigrationExecutionResult> {
    const now = new Date();

    const result = await this.database
      .update(bookmarksTable)
      .set({
        userId: targetUserId,
        updatedAt: now,
      })
      .where(eq(bookmarksTable.userId, sourceUserId))
      .returning({ id: bookmarksTable.id });

    return {
      sourceUserId,
      targetUserId,
      migratedCount: result.length,
      executedAt: now,
    };
  }
}
