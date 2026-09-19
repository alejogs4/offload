import { describe, it, expect } from "vitest";
import { AdminAuthorizationService } from "../admin-authorization-service";

describe("AdminAuthorizationService", () => {
  const service = new AdminAuthorizationService("admin@offload.local");

  it("should return true when user role is 'admin'", () => {
    expect(
      service.isAdmin({
        id: "user-123",
        role: "admin",
      })
    ).toBe(true);
  });

  it("should return true when user email matches configured admin email (case-insensitive)", () => {
    expect(
      service.isAdmin({
        id: "user-123",
        email: "ADMIN@offload.local",
      })
    ).toBe(true);
  });

  it("should return false when user email does not match and role is not admin", () => {
    expect(
      service.isAdmin({
        id: "user-123",
        email: "member@offload.local",
        role: "member",
      })
    ).toBe(false);
  });

  it("should return true for single-user fallback admin identities", () => {
    expect(service.isAdmin({ id: "admin-user" })).toBe(true);
    expect(service.isAdmin({ id: "local-admin" })).toBe(true);
  });

  it("should return false for regular single-user identities", () => {
    expect(service.isAdmin({ id: "local-user-1" })).toBe(false);
  });

  it("should return false for null or undefined user", () => {
    expect(service.isAdmin(null)).toBe(false);
    expect(service.isAdmin(undefined)).toBe(false);
  });
});
