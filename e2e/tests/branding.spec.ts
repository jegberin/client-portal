import { test, expect } from "@playwright/test";

test.describe("Branding", () => {
  test("branding settings page loads", async ({ page }) => {
    await page.goto("/dashboard/settings/branding");
    await expect(page.getByRole("heading", { name: /branding/i })).toBeVisible();
  });

  test("color pickers are visible", async ({ page }) => {
    await page.goto("/dashboard/settings/branding");
    await expect(page.getByText(/primary color/i)).toBeVisible();
    await expect(page.getByText(/accent color/i)).toBeVisible();
  });
});
