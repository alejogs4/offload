import { describe, it, expect } from "vitest";
import { auth } from "../auth.server";
import { user, session, account, verification } from "~/shared/infrastructure/db/schema";

describe("Better-Auth Server Configuration & Schema Mapping", () => {
  it("should initialize Better-Auth instance with required handler and API methods", () => {
    expect(auth).toBeDefined();
    expect(typeof auth.handler).toBe("function");
    expect(auth.api).toBeDefined();
    expect(typeof auth.api.getSession).toBe("function");
  });

  it("should configure GitHub and Google social providers", () => {
    expect(auth.options.socialProviders).toBeDefined();
    expect(auth.options.socialProviders).toHaveProperty("github");
    expect(auth.options.socialProviders).toHaveProperty("google");
  });

  it("should configure session cookie cache and expiration", () => {
    expect(auth.options.session).toBeDefined();
    expect(auth.options.session?.cookieCache?.enabled).toBe(true);
    expect(auth.options.session?.expiresIn).toBe(60 * 60 * 24 * 30);
  });

  it("should adhere to user constraint: NO image column in user schema", () => {
    const userColumns = Object.keys(user);
    expect(userColumns).not.toContain("image");
    expect(userColumns).toContain("id");
    expect(userColumns).toContain("email");
    expect(userColumns).toContain("name");
  });

  it("should have correct relational table definitions", () => {
    expect(user).toBeDefined();
    expect(session).toBeDefined();
    expect(account).toBeDefined();
    expect(verification).toBeDefined();
  });
});
