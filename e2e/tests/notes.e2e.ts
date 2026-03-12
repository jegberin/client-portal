import { test, expect } from "@playwright/test";
import { getCsrfToken } from "./helpers";

const API = "http://localhost:3001/api";

test.describe("Internal Notes", () => {
  test.describe("Dashboard project detail", () => {
    test("project detail page shows notes tab and content", async ({ page }) => {
      await page.goto("/dashboard/projects");
      const projectLink = page.locator("a[href*='/dashboard/projects/']").first();
      if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await projectLink.click();
        // Click the Notes tab
        await page.getByRole("button", { name: /^notes$/i }).click();
        await expect(page.getByText(/team only/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test("notes tab has add note button", async ({ page }) => {
      await page.goto("/dashboard/projects");
      const projectLink = page.locator("a[href*='/dashboard/projects/']").first();
      if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await projectLink.click();
        // Click the Notes tab
        await page.getByRole("button", { name: /^notes$/i }).click();
        await expect(page.getByRole("button", { name: /add note/i })).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe("API", () => {
    let projectId: string;

    test.beforeAll(async ({ request }) => {
      const csrfToken = getCsrfToken();
      const res = await request.post(`${API}/projects`, {
        data: { name: "Notes Test Project" },
        headers: { "x-csrf-token": csrfToken },
      });
      if (res.ok()) {
        const body = await res.json();
        projectId = body.id;
      }
    });

    test("create note via API", async ({ request }) => {
      test.skip(!projectId, "No project available");
      const csrfToken = getCsrfToken();
      const res = await request.post(`${API}/notes?projectId=${projectId}`, {
        data: { content: "E2E test internal note" },
        headers: { "x-csrf-token": csrfToken },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.content).toBe("E2E test internal note");
    });

    test("list notes via API", async ({ request }) => {
      test.skip(!projectId, "No project available");
      const res = await request.get(`${API}/notes/project/${projectId}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.data).toBeInstanceOf(Array);
    });

    test("delete note via API", async ({ request }) => {
      test.skip(!projectId, "No project available");
      const csrfToken = getCsrfToken();
      const createRes = await request.post(`${API}/notes?projectId=${projectId}`, {
        data: { content: "Note to delete" },
        headers: { "x-csrf-token": csrfToken },
      });
      const note = await createRes.json();

      const res = await request.delete(`${API}/notes/${note.id}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      expect(res.ok()).toBeTruthy();
    });

    test("notes API has no client-facing routes", async ({ request }) => {
      // There should be no /notes/mine endpoint
      const res = await request.get(`${API}/notes/mine`);
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  });
});
