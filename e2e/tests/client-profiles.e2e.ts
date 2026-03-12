import { test, expect } from "@playwright/test";
import { getCsrfToken } from "./helpers";

const API = "http://localhost:3001/api";

test.describe("Client Profiles", () => {
  test.describe("Dashboard clients page", () => {
    test("clients page loads", async ({ page }) => {
      await page.goto("/dashboard/clients");
      await expect(page.locator("h1", { hasText: /clients/i })).toBeVisible();
    });

    test("clients page shows member list", async ({ page }) => {
      await page.goto("/dashboard/clients");
      await expect(page.locator("h1", { hasText: /clients/i })).toBeVisible();
      // The invite form should be visible
      await expect(page.getByPlaceholder(/client@/i)).toBeVisible();
    });
  });

  test.describe("Portal settings profile", () => {
    test("portal settings page shows profile section", async ({ page }) => {
      await page.goto("/portal/settings");
      await expect(page.getByText(/your profile/i)).toBeVisible({ timeout: 5000 });
    });

    test("portal settings has profile fields", async ({ page }) => {
      await page.goto("/portal/settings");
      await expect(page.getByText(/your profile/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/company/i)).toBeVisible();
      await expect(page.getByText(/phone/i)).toBeVisible();
    });
  });

  test.describe("API", () => {
    test("get own profile via API", async ({ request }) => {
      const res = await request.get(`${API}/clients/me/profile`);
      expect(res.ok()).toBeTruthy();
    });

    test("update own profile via API", async ({ request }) => {
      const csrfToken = getCsrfToken();
      const res = await request.put(`${API}/clients/me/profile`, {
        data: {
          company: "E2E Test Company",
          phone: "555-0123",
        },
        headers: { "x-csrf-token": csrfToken },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.company).toBe("E2E Test Company");
    });
  });
});
