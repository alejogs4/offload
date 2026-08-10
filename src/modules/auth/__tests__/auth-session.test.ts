import { describe, it, expect } from "vitest";
import { isPasscodeValid, createAuthCookieHeader, isAuthenticatedRequest } from "../application/auth-session";

describe("Auth Session", () => {
  it("should validate passcode against expected password", () => {
    process.env.APP_PASSWORD = "secret-passcode";
    expect(isPasscodeValid("secret-passcode")).toBe(true);
    expect(isPasscodeValid("wrong-passcode")).toBe(false);
  });

  it("should generate Set-Cookie header", () => {
    const cookieHeader = createAuthCookieHeader(true);
    expect(cookieHeader).toContain("offload_passcode_session=true");
    expect(cookieHeader).toContain("HttpOnly");
  });

  it("should verify authenticated request from Cookie header", () => {
    expect(isAuthenticatedRequest("offload_passcode_session=true; Path=/")).toBe(true);
    expect(isAuthenticatedRequest("other_cookie=123")).toBe(false);
    expect(isAuthenticatedRequest(null)).toBe(false);
  });
});
