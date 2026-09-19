import {
  AdminRepositoryPort,
  LegacyMigrationStatus,
} from "../domain/admin-repository-port";

export class GetLegacyMigrationStatusQuery {
  constructor(private readonly adminRepository: AdminRepositoryPort) {}

  async execute(legacyUserId = "local-user-1"): Promise<LegacyMigrationStatus> {
    return await this.adminRepository.getLegacyMigrationStatus(legacyUserId);
  }
}
