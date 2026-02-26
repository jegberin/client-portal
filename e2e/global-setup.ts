import { chromium } from "@playwright/test";

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const email = `e2e-${Date.now()}@test.local`;
  const password = "TestPass123!";

  // Sign up via the API directly (more reliable than form interaction)
  const apiUrl = "http://localhost:3001";
  const res = await page.request.post(`${apiUrl}/api/onboarding/signup`, {
    data: { name: "E2E Test User", email, password, orgName: "E2E Test Org" },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Signup failed (${res.status()}): ${body}`);
  }

  // The signup response sets session cookies on the API domain.
  // Navigate to a page that will establish the cookies in the browser context.
  // The API already set cookies via Set-Cookie headers on the response above.
  // Now navigate to the web app — the dashboard layout will check the session
  // via server-side fetch to the API, forwarding cookies.
  // New accounts redirect to /setup since setupCompleted=false.
  await page.goto("http://localhost:3000/dashboard", {
    waitUntil: "networkidle",
    timeout: 15000,
  });

  let url = page.url();
  if (url.includes("/login")) {
    // Cookies might not have propagated. Try logging in explicitly.
    await page.goto("http://localhost:3000/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(setup|dashboard)/, { timeout: 15000 });
    url = page.url();
  }

  // If redirected to setup wizard, complete it so existing tests work
  if (url.includes("/setup")) {
    // Wait for the setup wizard to load
    await page.waitForSelector("text=Organization Profile", {
      timeout: 10000,
    });

    // Complete setup by calling the API directly
    const completeRes = await page.request.post(
      `${apiUrl}/api/setup/complete`,
      {},
    );
    if (!completeRes.ok()) {
      // Fallback: step through the wizard manually
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForSelector("text=Email Configuration", {
        timeout: 5000,
      });
      await page.getByRole("button", { name: /skip & continue/i }).click();
      await page.waitForSelector("text=Create Your First Project", {
        timeout: 5000,
      });
      await page.getByRole("button", { name: /skip/i }).first().click();
      await page.waitForSelector("text=Invite a Client", { timeout: 5000 });
      await page.getByRole("button", { name: /skip/i }).first().click();
      await page.waitForSelector("text=You are all set", { timeout: 5000 });
      await page.getByRole("button", { name: /go to dashboard/i }).click();
      await page.waitForURL("**/dashboard", { timeout: 15000 });
    } else {
      // Navigate to dashboard after completing setup via API
      await page.goto("http://localhost:3000/dashboard", {
        waitUntil: "networkidle",
        timeout: 15000,
      });
    }
  }

  await context.storageState({ path: "e2e/.auth/user.json" });
  await browser.close();
}

export default globalSetup;
