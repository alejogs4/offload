export interface SystemStats {
  totalBookmarks: number;
  pendingCount: number;
  visitedCount: number;
  processingCount: number;
  failedCount: number;
  dbLatencyMs: number;
}

export interface LegacyMigrationStatus {
  legacyUserId: string;
  pendingCount: number;
  lastMigratedAt: Date | null;
}

export interface MigrationExecutionResult {
  sourceUserId: string;
  targetUserId: string;
  migratedCount: number;
  executedAt: Date;
}

export interface AdminRepositoryPort {
  getSystemStats(): Promise<SystemStats>;
  getLegacyMigrationStatus(legacyUserId?: string): Promise<LegacyMigrationStatus>;
  migrateLegacyBookmarks(
    sourceUserId: string,
    targetUserId: string
  ): Promise<MigrationExecutionResult>;
}
