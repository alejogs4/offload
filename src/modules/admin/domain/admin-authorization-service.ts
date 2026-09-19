export interface SessionUser {
  id: string;
  email?: string;
  role?: string;
}

export class AdminAuthorizationService {
  private readonly configuredAdminEmail: string;

  constructor(configuredAdminEmail?: string) {
    this.configuredAdminEmail =
      configuredAdminEmail || process.env.ADMIN_EMAIL || "admin@offload.local";
  }

  isAdmin(user: SessionUser | null | undefined): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (
      user.email &&
      user.email.toLowerCase() === this.configuredAdminEmail.toLowerCase()
    ) {
      return true;
    }
    // Fallback for single-user passcode mode when default session is configured
    return user.id === "admin-user" || user.id === "local-admin";
  }
}
