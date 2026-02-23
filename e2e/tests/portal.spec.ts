import { test, expect } from "@playwright/test";

test.describe("Portal", () => {
  test("portal home loads", async ({ page }) => {
    await page.goto("/portal");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view projects/i })).toBeVisible();
  });

  test("portal has header with branding slot", async ({ page }) => {
    await page.goto("/portal");
    await expect(page.getByText(/client portal/i)).toBeVisible();
  });
});
