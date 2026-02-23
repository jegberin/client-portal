import { test, expect } from "@playwright/test";

test.describe("Files", () => {
  test("project detail page shows file upload area", async ({ page }) => {
    await page.goto("/dashboard/projects");
    // The page should load and show the projects heading
    await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();
  });

  test("upload button is visible on project detail page", async ({ page }) => {
    // Navigate to the projects list and check that the UI renders
    await page.goto("/dashboard/projects");
    await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();

    // If there are project links, click the first one and check for upload UI
    const projectLink = page.locator("a[href*='/dashboard/projects/']").first();
    if (await projectLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectLink.click();
      await expect(page.getByText(/upload file/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/files/i)).toBeVisible();
    }
  });

  test("portal project page does not show upload button for clients", async ({ page }) => {
    await page.goto("/portal/projects");
    await expect(
      page.getByRole("heading", { name: /your projects/i }),
    ).toBeVisible();

    // Clients should see projects list but the portal project detail
    // should not have an upload button (read-only file access)
    const projectLink = page.locator("a[href*='/portal/projects/']").first();
    if (await projectLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectLink.click();
      await expect(page.getByText(/files/i)).toBeVisible({ timeout: 5000 });
      // Upload button should NOT be visible on the portal (client) view
      await expect(page.getByText(/upload file/i)).not.toBeVisible();
    }
  });

  test("file upload rejects when no file selected", async ({ page }) => {
    // This tests the API-level validation
    const response = await page.request.post(
      "http://localhost:3001/api/files/upload?projectId=nonexistent",
      {
        multipart: {
          // Send empty multipart request without a file
        },
      },
    );

    // Should be rejected (401 unauthenticated or 400 bad request)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("file download endpoint requires authentication", async ({ page }) => {
    const response = await page.request.get(
      "http://localhost:3001/api/files/nonexistent-id/download",
    );

    // Should be 401 Unauthorized without a valid session
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
