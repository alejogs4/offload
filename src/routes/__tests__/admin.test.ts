import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader as adminLayoutLoader } from "../admin";
import { loader as adminIndexLoader } from "../admin._index";
import {
  loader as adminMigrationsLoader,
  action as adminMigrationsAction,
} from "../admin.migrations";
import { AUTH_COOKIE_NAME } from "~/modules/auth/application/auth-session";
import {
  adminAuthService,
  getAdminSystemStatsQuery,
  getLegacyMigrationStatusQuery,
  migrateLegacyBookmarksHandler,
} from "~/shared/infrastructure/container";

function extractServerTimingHeader(res: any): string | undefined {
  if (res instanceof Response) {
    return res.headers.get("Server-Timing") ?? undefined;
  }
  if (res && typeof res === "object" && "init" in res && res.init?.headers) {
    const headers = res.init.headers;
    if (headers instanceof Headers) {
      return headers.get("Server-Timing") ?? undefined;
    }
    if (typeof headers === "object") {
      return (headers as any)["Server-Timing"];
    }
  }
  return undefined;
}

function extractPayload(res: any): any {
  if (res && typeof res === "object" && "data" in res) {
    return res.data;
  }
  return res;
}

describe("Admin Route Layout & Child Handlers", () => {
  const authHeader = `${AUTH_COOKIE_NAME}=true`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Root Admin Layout Guard (routes/admin.tsx)", () => {
    it("should redirect unauthenticated requests with HTTP 302 to /login", async () => {
      const request = new Request("http://localhost:3000/admin", {
        headers: {},
      });

      const response = (await adminLayoutLoader({
        request,
        params: {},
        context: {} as any,
      } as any)) as Response;

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login");
    });

    it("should return HTTP 403 Forbidden when authenticated user is not an admin", async () => {
      vi.spyOn(adminAuthService, "isAdmin").mockReturnValueOnce(false);

      const request = new Request("http://localhost:3000/admin", {
        headers: {
          Cookie: authHeader,
        },
      });

      const response = await adminLayoutLoader({
        request,
        params: {},
        context: {} as any,
      } as any);

      // React Router data response with status 403
      const status = (response as any).init?.status;
      expect(status).toBe(403);
      const data = extractPayload(response);
      expect(data.authorized).toBe(false);
    });

    it("should grant access and return user info with Server-Timing when user is admin", async () => {
      vi.spyOn(adminAuthService, "isAdmin").mockReturnValueOnce(true);

      const request = new Request("http://localhost:3000/admin", {
        headers: {
          Cookie: authHeader,
        },
      });

      const response = await adminLayoutLoader({
        request,
        params: {},
        context: {} as any,
      } as any);

      const serverTiming = extractServerTimingHeader(response);
      expect(serverTiming).toBeDefined();
      expect(serverTiming).toContain("auth;dur=");

      const data = extractPayload(response);
      expect(data.authorized).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.role).toBe("admin");
    });
  });

  describe("Admin Overview (routes/admin._index.tsx)", () => {
    it("should return system stats and Server-Timing header", async () => {
      vi.spyOn(getAdminSystemStatsQuery, "execute").mockResolvedValueOnce({
        totalBookmarks: 42,
        pendingCount: 20,
        visitedCount: 18,
        processingCount: 2,
        failedCount: 2,
        dbLatencyMs: 4.25,
      });

      const request = new Request("http://localhost:3000/admin", {
        headers: {
          Cookie: authHeader,
        },
      });

      const response = await adminIndexLoader({
        request,
        params: {},
        context: {} as any,
      } as any);

      const serverTiming = extractServerTimingHeader(response);
      expect(serverTiming).toBeDefined();
      expect(serverTiming).toContain("db-admin-stats;dur=");

      const data = extractPayload(response);
      expect(data.stats.totalBookmarks).toBe(42);
      expect(data.stats.pendingCount).toBe(20);
    });
  });

  describe("Admin Migrations (routes/admin.migrations.tsx)", () => {
    it("should return legacy migration status in loader", async () => {
      vi.spyOn(getLegacyMigrationStatusQuery, "execute").mockResolvedValueOnce({
        legacyUserId: "local-user-1",
        pendingCount: 14,
        lastMigratedAt: null,
      });

      const request = new Request("http://localhost:3000/admin/migrations", {
        headers: {
          Cookie: authHeader,
        },
      });

      const response = await adminMigrationsLoader({
        request,
        params: {},
        context: {} as any,
      } as any);

      const serverTiming = extractServerTimingHeader(response);
      expect(serverTiming).toBeDefined();
      expect(serverTiming).toContain("db-legacy-status;dur=");

      const data = extractPayload(response);
      expect(data.status.pendingCount).toBe(14);
      expect(data.status.legacyUserId).toBe("local-user-1");
    });

    it("should execute legacy migration action atomically and return count with Server-Timing", async () => {
      const now = new Date();
      vi.spyOn(migrateLegacyBookmarksHandler, "execute").mockResolvedValueOnce({
        sourceUserId: "local-user-1",
        targetUserId: "admin-user",
        migratedCount: 14,
        executedAt: now,
      });

      const formData = new FormData();
      formData.set("intent", "migrate_legacy");
      formData.set("targetUserId", "admin-user");

      const request = new Request("http://localhost:3000/admin/migrations", {
        method: "POST",
        headers: {
          Cookie: authHeader,
        },
        body: formData,
      });

      const response = await adminMigrationsAction({
        request,
        params: {},
        context: {} as any,
      } as any);

      const serverTiming = extractServerTimingHeader(response);
      expect(serverTiming).toBeDefined();
      expect(serverTiming).toContain("db-migrate-legacy;dur=");

      const data = extractPayload(response);
      expect(data).toEqual({
        success: true,
        migratedCount: 14,
        executedAt: now.toISOString(),
      });
      expect(migrateLegacyBookmarksHandler.execute).toHaveBeenCalledWith({
        sourceUserId: "local-user-1",
        targetUserId: "admin-user",
      });
    });
  });
});
