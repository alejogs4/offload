/**
 * @deprecated Legacy passcode authentication session helpers.
 * Replaced by Better-Auth multi-user authentication (`src/shared/infrastructure/auth/auth.server.ts`).
 */
export const AUTH_COOKIE_NAME = "offload_passcode_session";
export const DEFAULT_USER_ID = "local-user-1";

/** @deprecated */
export function isPasscodeValid(passcode: string): boolean {
  const expectedPassword = process.env.APP_PASSWORD || "admin123";
  return passcode === expectedPassword;
}

/** @deprecated */
export function createAuthCookieHeader(isLoggedIn: boolean): string {
  const maxAge = isLoggedIn ? 60 * 60 * 24 * 30 : 0;
  return `${AUTH_COOKIE_NAME}=${isLoggedIn ? "true" : ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/** @deprecated */
export function isAuthenticatedRequest(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.includes(`${AUTH_COOKIE_NAME}=true`);
}
