import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader, action } from "../dashboard";
import { AUTH_COOKIE_NAME, DEFAULT_USER_ID } from "~/modules/auth/application/auth-session";
import { getFolderTreeQuery, markBookmarkVisitedHandler, createBookmarkHandler } from "~/shared/infrastructure/container";
import { InvariantViolationError } from "~/shared/domain/errors";

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
  const authHeader = `${AUTH_COOKIE_NAME}=true`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return Server-Timing header on authenticated loader requests", async () => {
    vi.spyOn(getFolderTreeQuery, "execute").mockResolvedValue({
      pendingFolders: [],
      visitedBookmarks: [],
      processingBookmarks: [],
    });

    const request = new Request("http://localhost:3000/", {
      headers: {
        Cookie: authHeader,
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
  });

  it("should redirect unauthenticated loader requests to /login", async () => {
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

  it("should return Server-Timing header on mark_visited action execution", async () => {
    vi.spyOn(markBookmarkVisitedHandler, "execute").mockResolvedValue(undefined);

    const formData = new FormData();
    formData.set("intent", "mark_visited");
    formData.set("bookmarkId", "123e4567-e89b-12d3-a456-426614174000");

    const request = new Request("http://localhost:3000/", {
      method: "POST",
      headers: {
        Cookie: authHeader,
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
      userId: DEFAULT_USER_ID,
      bookmarkId: "123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("should mask uncaught database errors as 'Internal error' when creating bookmark", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(createBookmarkHandler, "execute").mockRejectedValue(
      new Error("FOREIGN KEY constraint failed: insert into bookmarks")
    );

    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("url", "https://example.com/test");

    const request = new Request("http://localhost:3000/", {
      method: "POST",
      headers: {
        Cookie: authHeader,
      },
      body: formData,
    });

    const response = await action({
      request,
      params: {},
      context: {} as any,
    } as any);

    const data = extractPayload(response);
    expect(data).toEqual({ error: "Internal error" });
    consoleSpy.mockRestore();
  });

  it("should preserve domain error message when domain invariant fails", async () => {
    vi.spyOn(createBookmarkHandler, "execute").mockRejectedValue(
      new InvariantViolationError("Invalid domain state")
    );

    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("url", "https://example.com/test");

    const request = new Request("http://localhost:3000/", {
      method: "POST",
      headers: {
        Cookie: authHeader,
      },
      body: formData,
    });

    const response = await action({
      request,
      params: {},
      context: {} as any,
    } as any);

    const data = extractPayload(response);
    expect(data).toEqual({ error: "Invalid domain state" });
  });

  it("should return validation error for invalid URL", async () => {
    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("url", "not-a-valid-url");

    const request = new Request("http://localhost:3000/", {
      method: "POST",
      headers: {
        Cookie: authHeader,
      },
      body: formData,
    });

    const response = await action({
      request,
      params: {},
      context: {} as any,
    } as any);

    const data = extractPayload(response);
    expect(data).toEqual({ error: "A valid URL is required" });
  });
});

