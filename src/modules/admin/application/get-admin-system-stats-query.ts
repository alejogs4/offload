import {
  AdminRepositoryPort,
  SystemStats,
} from "../domain/admin-repository-port";

export class GetAdminSystemStatsQuery {
  constructor(private readonly adminRepository: AdminRepositoryPort) {}

  async execute(): Promise<SystemStats> {
    return await this.adminRepository.getSystemStats();
  }
}
