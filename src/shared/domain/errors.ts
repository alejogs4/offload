export class DomainError extends Error {
  readonly isDomainError = true;

  constructor(message: string) {
    super(message);
    this.name = "DomainError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvariantViolationError";
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Transforms any error into a safe user-facing message.
 * Domain errors and validation errors provide safe, intentional messages.
 * All uncaught, internal, and infrastructure errors are logged to the console
 * and converted to the generic user-facing message (default: "Internal error").
 */
export function toUserErrorMessage(error: unknown, fallbackMessage = "Internal error"): string {
  if (error instanceof DomainError) {
    return error.message;
  }

  if (error && typeof error === "object" && "isDomainError" in error && (error as any).isDomainError) {
    return (error as any).message || fallbackMessage;
  }

  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as any).issues)) {
    const issues = (error as any).issues;
    if (issues.length > 0 && issues[0]?.message) {
      return issues[0].message;
    }
  }

  // Internal / system error: Log details for telemetry/debugging and mask from user
  console.error("[Internal Error]:", error);

  return fallbackMessage;
}
