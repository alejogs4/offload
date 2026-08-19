import { waitUntil } from "@vercel/functions";

/**
 * Executes a promise in the background.
 * In Vercel serverless environments, it delegates to `@vercel/functions` waitUntil
 * to keep the execution context alive after the HTTP response is returned.
 * In local development and testing environments, it runs the promise in the Node event loop
 * with error logging.
 */
export function runBackground(promise: Promise<unknown>): void {
  try {
    if (typeof waitUntil === "function") {
      waitUntil(promise);
      return;
    }
  } catch {
    // If waitUntil is not active in this runtime context, fall through to local promise execution
  }

  promise.catch((err) => {
    console.error("[Background Task Error]:", err);
  });
}
