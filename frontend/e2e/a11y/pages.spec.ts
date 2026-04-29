import { test } from "@playwright/test";
import { runAxe } from "./axe-helper";

/**
 * Automated accessibility checks for the routes that own the most
 * user-facing flow: home/swap, browse, track, dashboard, fees, and the
 * 404 page (since it's the most likely accidental landing point).
 *
 * Each test scans the page after it reaches `networkidle`, fails on any
 * `serious` or `critical` violation, and attaches a JSON report listing
 * every impacted element to the Playwright HTML report.
 */

const KEY_PAGES = [
  { path: "/", name: "Home / Swap" },
  { path: "/browse", name: "Browse Orders" },
  { path: "/track", name: "Track Swaps" },
  { path: "/dashboard", name: "Dashboard" },
  { path: "/fees", name: "Fee Estimator" },
  { path: "/this-route-does-not-exist", name: "404 Not Found" },
] as const;

test.describe("Accessibility — key pages", () => {
  for (const { path, name } of KEY_PAGES) {
    test(`${name} (${path}) passes axe-core checks`, async ({ page }, testInfo) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {
        /* some pages stream — ok if networkidle never fires */
      });
      await runAxe(page, testInfo, {
        // Third-party widgets we don't control go here. None today.
        exclude: [],
      });
    });
  }
});

test.describe("Accessibility — interactive states", () => {
  test("Home page with mobile menu open", async ({ page }, testInfo) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /menu|navigation/i }).first();
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
    }
    await runAxe(page, testInfo);
  });
});
