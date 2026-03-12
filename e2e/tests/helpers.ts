import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { BrowserContext } from "@playwright/test";

/**
 * Read the CSRF token from the stored auth state file written by global-setup.
 * This is used by tests that make API calls via the `request` fixture (which
 * carries cookies from stored state but does NOT automatically set the
 * x-csrf-token header).
 */
export function getCsrfToken(): string {
  // The global-setup writes to "e2e/.auth/user.json" (relative to repo root).
  // Depending on cwd, the file could be at either of these paths.
  const candidates = [
    resolve(__dirname, "../.auth/user.json"),
    resolve(__dirname, "../e2e/.auth/user.json"),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      const state = JSON.parse(readFileSync(p, "utf-8"));
      const cookie = state.cookies?.find(
        (c: { name: string }) => c.name === "csrf-token",
      );
      return cookie?.value || "";
    }
  }

  return "";
}

/**
 * Read the CSRF token from a live browser context's cookies.
 * Use this for tests that create fresh contexts (e.g. browser.newContext())
 * where the stored auth state is not applicable.
 */
export async function getCsrfTokenFromContext(
  context: BrowserContext,
): Promise<string> {
  const cookies = await context.cookies();
  const cookie = cookies.find((c) => c.name === "csrf-token");
  return cookie?.value || "";
}
