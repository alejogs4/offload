import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "../_authenticated";
import { auth } from "~/shared/infrastructure/auth/auth.server";

describe("Protected Layout Guard (_authenticated.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect unauthenticated requests with 302 to /login", async () => {
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

  it("should allow authenticated requests and return active user and session", async () => {
    const mockUser = {
      id: "usr_999",
      name: "Jane Doe",
      email: "jane@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSession = {
      id: "sess_111",
      userId: "usr_999",
      token: "valid_token",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: mockUser,
      session: mockSession,
    } as any);

    const request = new Request("http://localhost:3000/", {
      headers: {
        Cookie: "better-auth.session_token=valid_token",
      },
    });

    const result = await loader({
      request,
      params: {},
      context: {} as any,
    } as any);

    expect(result).not.toBeInstanceOf(Response);
    expect(result).toEqual({
      user: mockUser,
      session: mockSession,
    });
  });
});
