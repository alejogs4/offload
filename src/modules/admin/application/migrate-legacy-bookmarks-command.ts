import { z } from "zod";
import {
  AdminRepositoryPort,
  MigrationExecutionResult,
} from "../domain/admin-repository-port";

export const MigrateLegacyBookmarksInputSchema = z.object({
  targetUserId: z.string().min(1, { message: "Target user ID is required" }),
  sourceUserId: z.string().default("local-user-1"),
});

export type MigrateLegacyBookmarksInput = z.input<
  typeof MigrateLegacyBookmarksInputSchema
>;


export class MigrateLegacyBookmarksCommandHandler {
  constructor(private readonly adminRepository: AdminRepositoryPort) {}

  async execute(
    rawInput: MigrateLegacyBookmarksInput
  ): Promise<MigrationExecutionResult> {
    const input = MigrateLegacyBookmarksInputSchema.parse(rawInput);
    return await this.adminRepository.migrateLegacyBookmarks(
      input.sourceUserId,
      input.targetUserId
    );
  }
}
