import { describe, it, expect, vi } from "vitest";
import {
  DomainError,
  InvariantViolationError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  toUserErrorMessage,
} from "../errors";

describe("Domain Errors & Error Sanitization", () => {
  it("should preserve message for DomainError subclasses", () => {
    const invariantErr = new InvariantViolationError("Cannot process visited bookmark");
    const unauthorizedErr = new UnauthorizedError("Cannot access this resource");
    const notFoundErr = new NotFoundError("Bookmark not found");
    const validationErr = new ValidationError("Invalid domain payload");

    expect(invariantErr).toBeInstanceOf(DomainError);
    expect(toUserErrorMessage(invariantErr)).toBe("Cannot process visited bookmark");
    expect(toUserErrorMessage(unauthorizedErr)).toBe("Cannot access this resource");
    expect(toUserErrorMessage(notFoundErr)).toBe("Bookmark not found");
    expect(toUserErrorMessage(validationErr)).toBe("Invalid domain payload");
  });

  it("should mask uncaught internal errors and log them to console.error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const dbConstraintError = new Error("FOREIGN KEY constraint failed");
    const connectionError = new Error("connect ECONNREFUSED 127.0.0.1:5432");
    const genericObj = { rawSql: "SELECT * FROM secrets" };

    expect(toUserErrorMessage(dbConstraintError)).toBe("Internal error");
    expect(toUserErrorMessage(connectionError)).toBe("Internal error");
    expect(toUserErrorMessage(genericObj)).toBe("Internal error");

    expect(consoleSpy).toHaveBeenCalledWith("[Internal Error]:", dbConstraintError);
    expect(consoleSpy).toHaveBeenCalledWith("[Internal Error]:", connectionError);
    expect(consoleSpy).toHaveBeenCalledWith("[Internal Error]:", genericObj);

    consoleSpy.mockRestore();
  });

  it("should extract message from Zod-like error issues", () => {
    const zodLikeError = {
      issues: [{ message: "A valid URL is required" }],
    };

    expect(toUserErrorMessage(zodLikeError)).toBe("A valid URL is required");
  });
});
