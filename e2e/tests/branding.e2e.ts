import { test, expect } from "@playwright/test";

test.describe("Branding", () => {
  test("branding section is visible on system settings page", async ({ page }) => {
    await page.goto("/dashboard/settings/system");
    await expect(page.getByRole("heading", { name: /branding/i })).toBeVisible();
  });

  test("color pickers are visible on system settings page", async ({ page }) => {
    await page.goto("/dashboard/settings/system");
    await expect(page.getByText(/primary color/i)).toBeVisible();
    await expect(page.getByText(/accent color/i)).toBeVisible();
  });

  test("logo upload area is visible on system settings page", async ({ page }) => {
    await page.goto("/dashboard/settings/system");
    await expect(page.getByText("Company Logo", { exact: true })).toBeVisible();
  });

  test("preview bar is visible on system settings page", async ({ page }) => {
    await page.goto("/dashboard/settings/system");
    await expect(page.getByText(/preview/i)).toBeVisible();
  });

  test("old branding route returns 404", async ({ page }) => {
    const response = await page.goto("/dashboard/settings/branding");
    // Should get a 404 or redirect since the page no longer exists
    if (response) {
      expect(response.status()).toBe(404);
    }
  });

  test("sidebar does NOT show branding link", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebarBrandingLink = page.locator("nav").getByRole("link", { name: /^branding$/i });
    await expect(sidebarBrandingLink).not.toBeVisible();
  });
});
