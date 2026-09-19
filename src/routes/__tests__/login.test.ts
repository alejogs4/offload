import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "../login";
import { auth } from "~/shared/infrastructure/auth/auth.server";

describe("Login Route (login.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to / if user already has an active session", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: { id: "usr_1" },
      session: { id: "sess_1" },
    } as any);

    const request = new Request("http://localhost:3000/login");
    const response = (await loader({
      request,
      params: {},
      context: {} as any,
    } as any)) as Response;

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
  });

  it("should return configuredProviders and parse error parameters for unauthenticated visitors", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null);

    const request = new Request("http://localhost:3000/login?error=access_denied");
    const result = await loader({
      request,
      params: {},
      context: {} as any,
    } as any);

    expect(result).toEqual({
      error: "Sign-in was cancelled or access was denied.",
      configuredProviders: {
        github: expect.any(Boolean),
        google: expect.any(Boolean),
      },
    });
  });
});
