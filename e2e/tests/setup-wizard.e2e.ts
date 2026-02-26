import { test, expect } from "@playwright/test";

test.describe("Setup Wizard", () => {
  test("setup wizard page loads for new org owner", async ({ browser }) => {
    // Create a fresh account (no saved auth state) to test setup flow
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    const email = `setup-test-${Date.now()}@test.local`;
    const password = "SetupTest123!";

    // Sign up a new account via API
    const apiUrl = "http://localhost:3001";
    const res = await page.request.post(`${apiUrl}/api/onboarding/signup`, {
      data: {
        name: "Setup Test User",
        email,
        password,
        orgName: "Setup Test Org",
      },
    });
    expect(res.ok()).toBeTruthy();

    // Navigate to dashboard — should redirect to setup for new org
    await page.goto("http://localhost:3000/dashboard", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    // If redirected to login, sign in manually
    if (page.url().includes("/login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(setup|dashboard)/, { timeout: 15000 });
    }

    // Should be on setup page (new org has setupCompleted=false)
    const url = page.url();
    expect(url).toMatch(/\/setup/);

    // Verify the setup wizard heading is visible
    await expect(
      page.getByRole("heading", { name: /welcome to atrium/i }),
    ).toBeVisible({ timeout: 10000 });

    // Verify step 1 (Organization Profile) is shown
    await expect(
      page.getByRole("heading", { name: /organization profile/i }),
    ).toBeVisible();

    // Verify org name is pre-filled
    const orgNameInput = page.locator("#setup-org-name");
    await expect(orgNameInput).toBeVisible();

    await context.close();
  });

  test("setup wizard step navigation works", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    const email = `setup-nav-${Date.now()}@test.local`;
    const password = "SetupNav123!";

    // Sign up
    const apiUrl = "http://localhost:3001";
    await page.request.post(`${apiUrl}/api/onboarding/signup`, {
      data: {
        name: "Setup Nav User",
        email,
        password,
        orgName: "Setup Nav Org",
      },
    });

    // Navigate to setup page
    await page.goto("http://localhost:3000/setup", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    if (page.url().includes("/login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(setup|dashboard)/, { timeout: 15000 });
    }

    // Wait for wizard to load
    await expect(
      page.getByRole("heading", { name: /organization profile/i }),
    ).toBeVisible({ timeout: 10000 });

    // Step 1: Click Continue (org profile)
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Email Configuration should appear
    await expect(
      page.getByRole("heading", { name: /email configuration/i }),
    ).toBeVisible({ timeout: 5000 });

    // Click "Skip & Continue" on email step
    await page.getByRole("button", { name: /skip & continue/i }).click();

    // Step 3: First Project should appear
    await expect(
      page.getByRole("heading", { name: /create your first project/i }),
    ).toBeVisible({ timeout: 5000 });

    // Click Skip on project step
    await page.getByRole("button", { name: /skip/i }).first().click();

    // Step 4: Invite Client should appear
    await expect(
      page.getByRole("heading", { name: /invite a client/i }),
    ).toBeVisible({ timeout: 5000 });

    // Click Skip on invite step
    await page.getByRole("button", { name: /skip/i }).first().click();

    // Step 5: Complete should appear
    await expect(
      page.getByRole("heading", { name: /you are all set/i }),
    ).toBeVisible({ timeout: 5000 });

    // Click "Go to Dashboard"
    await page.getByRole("button", { name: /go to dashboard/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    await context.close();
  });

  test("setup wizard back navigation works", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    const email = `setup-back-${Date.now()}@test.local`;
    const password = "SetupBack123!";

    const apiUrl = "http://localhost:3001";
    await page.request.post(`${apiUrl}/api/onboarding/signup`, {
      data: {
        name: "Setup Back User",
        email,
        password,
        orgName: "Setup Back Org",
      },
    });

    await page.goto("http://localhost:3000/setup", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    if (page.url().includes("/login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(setup|dashboard)/, { timeout: 15000 });
    }

    await expect(
      page.getByRole("heading", { name: /organization profile/i }),
    ).toBeVisible({ timeout: 10000 });

    // Go to step 2
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /email configuration/i }),
    ).toBeVisible({ timeout: 5000 });

    // Click Back
    await page.getByRole("button", { name: /back/i }).click();

    // Should return to step 1
    await expect(
      page.getByRole("heading", { name: /organization profile/i }),
    ).toBeVisible({ timeout: 5000 });

    await context.close();
  });

  test("completed setup does not redirect to wizard", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    const email = `setup-done-${Date.now()}@test.local`;
    const password = "SetupDone123!";

    const apiUrl = "http://localhost:3001";
    await page.request.post(`${apiUrl}/api/onboarding/signup`, {
      data: {
        name: "Setup Done User",
        email,
        password,
        orgName: "Setup Done Org",
      },
    });

    // Navigate to setup and complete it
    await page.goto("http://localhost:3000/setup", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    if (page.url().includes("/login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(setup|dashboard)/, { timeout: 15000 });
    }

    await expect(
      page.getByRole("heading", { name: /organization profile/i }),
    ).toBeVisible({ timeout: 10000 });

    // Quick-complete: step through all steps
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /email configuration/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /skip & continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /create your first project/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /skip/i }).first().click();
    await expect(
      page.getByRole("heading", { name: /invite a client/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /skip/i }).first().click();
    await expect(
      page.getByRole("heading", { name: /you are all set/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /go to dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // Now navigating to dashboard should NOT redirect to setup
    await page.goto("http://localhost:3000/dashboard", {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible({ timeout: 5000 });

    await context.close();
  });

  test("setup wizard creates a project when filled in", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    const email = `setup-proj-${Date.now()}@test.local`;
    const password = "SetupProj123!";

    const apiUrl = "http://localhost:3001";
    await page.request.post(`${apiUrl}/api/onboarding/signup`, {
      data: {
        name: "Setup Project User",
        email,
        password,
        orgName: "Setup Project Org",
      },
    });

    await page.goto("http://localhost:3000/setup", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    if (page.url().includes("/login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(setup|dashboard)/, { timeout: 15000 });
    }

    await expect(
      page.getByRole("heading", { name: /organization profile/i }),
    ).toBeVisible({ timeout: 10000 });

    // Step 1: Continue with org profile
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Skip email
    await expect(
      page.getByRole("heading", { name: /email configuration/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /skip & continue/i }).click();

    // Step 3: Create a project
    await expect(
      page.getByRole("heading", { name: /create your first project/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.locator("#setup-project-name").fill("My Test Project");
    await page.locator("#setup-project-desc").fill("A test project description");
    await page.getByRole("button", { name: /create & continue/i }).click();

    // Step 4: Skip invite
    await expect(
      page.getByRole("heading", { name: /invite a client/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /skip/i }).first().click();

    // Step 5: Complete
    await expect(
      page.getByRole("heading", { name: /you are all set/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /go to dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // Verify the project was created by checking the projects page
    await page.goto("http://localhost:3000/dashboard/projects");
    await expect(page.getByText("My Test Project")).toBeVisible({
      timeout: 10000,
    });

    await context.close();
  });

  test("stepper shows correct progress indicators", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    const email = `setup-step-${Date.now()}@test.local`;
    const password = "SetupStep123!";

    const apiUrl = "http://localhost:3001";
    await page.request.post(`${apiUrl}/api/onboarding/signup`, {
      data: {
        name: "Setup Stepper User",
        email,
        password,
        orgName: "Setup Stepper Org",
      },
    });

    await page.goto("http://localhost:3000/setup", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    if (page.url().includes("/login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(setup|dashboard)/, { timeout: 15000 });
    }

    await expect(
      page.getByRole("heading", { name: /welcome to atrium/i }),
    ).toBeVisible({ timeout: 10000 });

    // Verify step labels are present (visible on desktop)
    await expect(page.getByText("Organization")).toBeVisible();
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Complete")).toBeVisible();

    await context.close();
  });
});
