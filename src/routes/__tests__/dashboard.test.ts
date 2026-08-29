import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader, action } from "../dashboard";
import { auth } from "~/shared/infrastructure/auth/auth.server";
import { getFolderTreeQuery, markBookmarkVisitedHandler, createBookmarkHandler } from "~/shared/infrastructure/container";

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

describe("Dashboard Route - Server-Timing & Handlers", () => {
  const mockUser = {
    id: "user-tenant-123",
    name: "Alex User",
    email: "alex@example.com",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession = {
    id: "session-abc-456",
    userId: mockUser.id,
    token: "valid-session-token",
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return Server-Timing header on authenticated loader requests and scope by user.id", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: mockUser,
      session: mockSession,
    } as any);

    vi.spyOn(getFolderTreeQuery, "execute").mockResolvedValue({
      pendingFolders: [],
      visitedBookmarks: [],
      processingBookmarks: [],
    });

    const request = new Request("http://localhost:3000/", {
      headers: {
        Cookie: "better-auth.session_token=valid-session-token",
      },
    });

    const response = await loader({
      request,
      params: {},
      context: {} as any,
    } as any);

    const serverTiming = extractServerTimingHeader(response);
    expect(serverTiming).toBeDefined();
    expect(serverTiming).toContain("auth;dur=");
    expect(serverTiming).toContain("total;dur=");

    const data = extractPayload(response);
    expect(data).toHaveProperty("folderTree");
    expect(getFolderTreeQuery.execute).toHaveBeenCalledWith(mockUser.id);
  });

  it("should redirect unauthenticated loader requests to /login", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null);

    const request = new Request("http://localhost:3000/", {
      headers: {},
    });

    const response = (await loader({
      request,
      params: {},
      context: {} as any,
    } as any)) as Response;

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  it("should return Server-Timing header on mark_visited action execution with session user.id", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: mockUser,
      session: mockSession,
    } as any);
    vi.spyOn(markBookmarkVisitedHandler, "execute").mockResolvedValue(undefined);

    const formData = new FormData();
    formData.set("intent", "mark_visited");
    formData.set("bookmarkId", "123e4567-e89b-12d3-a456-426614174000");

    const request = new Request("http://localhost:3000/", {
      method: "POST",
      headers: {
        Cookie: "better-auth.session_token=valid-session-token",
      },
      body: formData,
    });

    const response = await action({
      request,
      params: {},
      context: {} as any,
    } as any);

    const serverTiming = extractServerTimingHeader(response);
    expect(serverTiming).toBeDefined();
    expect(serverTiming).toContain("auth;dur=");
    expect(serverTiming).toContain("total;dur=");

    const data = extractPayload(response);
    expect(data).toEqual({ success: true });
    expect(markBookmarkVisitedHandler.execute).toHaveBeenCalledWith({
      userId: mockUser.id,
      bookmarkId: "123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("should create bookmark scoped to authenticated session user.id", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: mockUser,
      session: mockSession,
    } as any);
    vi.spyOn(createBookmarkHandler, "execute").mockResolvedValue({
      id: "new-bmk-1",
    } as any);

    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("url", "https://example.com/article");

    const request = new Request("http://localhost:3000/", {
      method: "POST",
      headers: {
        Cookie: "better-auth.session_token=valid-session-token",
      },
      body: formData,
    });

    const response = await action({
      request,
      params: {},
      context: {} as any,
    } as any);

    const data = extractPayload(response);
    expect(data).toEqual({ success: true, bookmarkId: "new-bmk-1" });
    expect(createBookmarkHandler.execute).toHaveBeenCalledWith({
      userId: mockUser.id,
      url: "https://example.com/article",
    });
  });
});
