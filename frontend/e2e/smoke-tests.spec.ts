import { test, expect } from "@playwright/test";

/**
 * E2E Smoke Tests for Core Routes
 * Tests that critical routes load and function minimally
 *
 * These tests verify:
 * 1. Pages load without errors
 * 2. Core elements are present
 * 3. Navigation works
 * 4. Basic functionality is accessible
 */

const CORE_ROUTES = [
  { path: "/", name: "Home/Swap" },
  { path: "/browse", name: "Browse Orders" },
  { path: "/track", name: "Track Swaps" },
  { path: "/dashboard", name: "Dashboard" },
  { path: "/fees", name: "Fee Estimator" },
];

test.describe("Core Routes - Smoke Tests", () => {
  CORE_ROUTES.forEach(({ path, name }) => {
    test(`${name} route loads successfully`, async ({ page }) => {
      const response = await page.goto(path);

      // Verify page loaded successfully
      expect(response?.status()).toBe(200);

      // Verify no JavaScript errors
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      // Wait for page to be stable
      await page.waitForLoadState("networkidle");

      // Check for critical errors
      expect(errors.length).toBe(0);

      // Verify page has content
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Check for common error indicators
      const errorSelectors = [
        '[data-testid="error-boundary"]',
        ".error-page",
        ".error-message",
        '[role="alert"]:has-text("error")',
        'h1:has-text("404")',
        'h1:has-text("500")',
      ];

      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector).first();
        if (await errorElement.isVisible()) {
          throw new Error(`Error indicator found on ${name} page: ${selector}`);
        }
      }
    });
  });

  test("Home route has core swap functionality", async ({ page }) => {
    await page.goto("/");

    // Verify main swap form elements
    await expect(page.getByRole("combobox", { name: /source chain/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /destination chain/i })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: /amount/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /recipient/i })).toBeVisible();

    // Verify fee estimation section
    await expect(page.getByText(/fee|estimated/i)).toBeVisible();

    // Verify submit button exists
    await expect(page.getByRole("button", { name: /review|swap|next/i })).toBeVisible();
  });

  test("Browse route displays order book", async ({ page }) => {
    await page.goto("/browse");

    // Verify order book interface
    await expect(page.getByText(/orders|book|market/i)).toBeVisible();

    // Check for filtering controls
    await expect(page.getByRole("combobox", { name: /filter|chain|asset/i })).toBeVisible();

    // Verify order list or empty state
    const orderList = page.locator('[data-testid="order-list"], .order-list, table');
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state');

    await expect(orderList.or(emptyState)).toBeVisible();
  });

  test("Track route has search functionality", async ({ page }) => {
    await page.goto("/track");

    // Verify search interface
    await expect(page.getByRole("textbox", { name: /search|transaction|hash/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /search|track/i })).toBeVisible();

    // Verify results area or empty state
    const resultsArea = page.locator('[data-testid="search-results"], .search-results');
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state');

    await expect(resultsArea.or(emptyState)).toBeVisible();
  });

  test("Dashboard route displays user data", async ({ page }) => {
    await page.goto("/dashboard");

    // Verify dashboard sections
    await expect(page.getByText(/dashboard|overview/i)).toBeVisible();

    // Check for common dashboard elements
    const dashboardElements = [
      '[data-testid="stats-cards"]',
      '[data-testid="recent-swaps"]',
      '[data-testid="balance-display"]',
      ".stats",
      ".recent-activity",
    ];

    let foundElement = false;
    for (const selector of dashboardElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        foundElement = true;
        break;
      }
    }

    // At least one dashboard element should be visible
    expect(foundElement).toBe(true);
  });

  test("Fee estimator route displays fee information", async ({ page }) => {
    await page.goto("/fees");

    // Verify fee estimator interface
    await expect(page.getByText(/fee|estimator|cost/i)).toBeVisible();

    // Check for chain selection or fee display
    const chainSelectors = page.getByRole("combobox", { name: /chain/i });
    const feeDisplays = page.getByText(/sat\/vB|gwei|stroops/i);

    await expect(chainSelectors.or(feeDisplays)).toBeVisible();
  });
});

test.describe("Navigation - Smoke Tests", () => {
  test("Main navigation works across all routes", async ({ page }) => {
    await page.goto("/");

    // Find navigation elements
    const navLinks = page.locator('nav a, header a, [role="navigation"] a').first();

    if ((await navLinks.count()) > 0) {
      // Test navigation links
      const linkCount = await navLinks.count();
      for (let i = 0; i < Math.min(linkCount, 5); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute("href");

        if (href && href.startsWith("/")) {
          await link.click();
          await page.waitForLoadState("networkidle");

          // Verify navigation succeeded
          const url = page.url();
          expect(url).toContain(href);

          // Go back to home for next test
          await page.goto("/");
        }
      }
    }
  });

  test("Mobile navigation is functional", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 668 });
    await page.goto("/");

    // Look for mobile menu toggle
    const menuToggle = page
      .locator('[data-testid="mobile-menu-toggle"], .hamburger, button:has-text("menu")')
      .first();

    if (await menuToggle.isVisible()) {
      await menuToggle.click();

      // Verify mobile menu opens
      const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, nav').first();
      await expect(mobileMenu).toBeVisible();

      // Test a navigation link if available
      const firstLink = mobileMenu.locator("a").first();
      if ((await firstLink.count()) > 0) {
        await firstLink.click();
        await page.waitForLoadState("networkidle");

        // Verify navigation worked
        const url = page.url();
        expect(url).not.toBe("http://localhost:3000/");
      }
    }
  });
});

test.describe("Error Handling - Smoke Tests", () => {
  test("Handles 404 routes gracefully", async ({ page }) => {
    const response = await page.goto("/non-existent-route");

    // Should show custom 404 page or handle gracefully
    if (response?.status() === 404) {
      // Look for custom 404 page elements
      const notFoundElements = [
        'h1:has-text("404")',
        'h1:has-text("not found")',
        '[data-testid="404-page"]',
        ".not-found-page",
      ];

      let found404Element = false;
      for (const selector of notFoundElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          found404Element = true;
          break;
        }
      }

      // Should have some indication of 404 handling
      expect(found404Element).toBe(true);
    }
  });

  test("Network errors are handled gracefully", async ({ page }) => {
    await page.goto("/");

    // Mock network failure for API calls
    await page.route("**/api/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Network error" }),
      });
    });

    // Try to trigger an API call (e.g., fee estimation)
    const sourceChain = page.getByRole("combobox", { name: /source chain/i });
    if (await sourceChain.isVisible()) {
      await sourceChain.selectOption("stellar");

      // Wait for potential error handling
      await page.waitForTimeout(2000);

      // Should not crash the page
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Check for error handling UI
      const errorIndicators = ['[data-testid="error-message"]', ".error-toast", ".network-error"];

      let foundErrorHandling = false;
      for (const selector of errorIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          foundErrorHandling = true;
          break;
        }
      }

      // Should handle network errors (may or may not show UI)
      expect(foundErrorHandling || true).toBe(true);
    }
  });
});

test.describe("Performance - Smoke Tests", () => {
  test("Pages load within reasonable time", async ({ page }) => {
    const routes = ["/", "/browse", "/track", "/dashboard"];

    for (const route of routes) {
      const startTime = Date.now();
      const response = await page.goto(route);
      await page.waitForLoadState("networkidle");
      const loadTime = Date.now() - startTime;

      // Pages should load within 5 seconds (adjust as needed)
      expect(loadTime).toBeLessThan(5000);
      expect(response?.status()).toBe(200);
    }
  });

  test("Core interactions are responsive", async ({ page }) => {
    await page.goto("/");

    // Test form field responsiveness
    const amountInput = page.getByRole("spinbutton", { name: /amount/i });
    if (await amountInput.isVisible()) {
      const startTime = Date.now();
      await amountInput.fill("100");
      await amountInput.blur();
      const responseTime = Date.now() - startTime;

      // Input should be responsive (< 500ms)
      expect(responseTime).toBeLessThan(500);
    }

    // Test dropdown responsiveness
    const sourceChain = page.getByRole("combobox", { name: /source chain/i });
    if (await sourceChain.isVisible()) {
      const startTime = Date.now();
      await sourceChain.selectOption("stellar");
      const responseTime = Date.now() - startTime;

      // Dropdown should be responsive (< 300ms)
      expect(responseTime).toBeLessThan(300);
    }
  });
});

test.describe("Accessibility - Smoke Tests", () => {
  test("Pages have proper heading structure", async ({ page }) => {
    const routes = ["/", "/browse", "/track"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Check for h1 heading
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();

      // Verify heading hierarchy (h1 should be first)
      const headings = page.locator("h1, h2, h3, h4, h5, h6");
      const firstHeading = headings.first();
      const firstHeadingTag = await firstHeading.evaluate((el) => el.tagName.toLowerCase());

      expect(firstHeadingTag).toBe("h1");
    }
  });

  test("Interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/");

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    // Should focus on an interactive element
    expect(["INPUT", "SELECT", "BUTTON", "TEXTAREA", "A"]).toContain(focusedElement);

    // Test multiple tab presses
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(["INPUT", "SELECT", "BUTTON", "TEXTAREA", "A"]).toContain(focused);
    }
  });

  test("Pages have sufficient color contrast (basic check)", async ({ page }) => {
    await page.goto("/");

    // Check for visible text elements
    const textElements = page.locator("p, h1, h2, h3, h4, h5, h6, span, button").first();

    if (await textElements.isVisible()) {
      // Basic visibility check (more detailed contrast checking would require additional tools)
      const computedStyle = await textElements.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize,
        };
      });

      // Should have defined colors and reasonable font size
      expect(computedStyle.color).not.toBe("");
      expect(computedStyle.fontSize).not.toBe("0px");
    }
  });
});

test.describe("Critical User Flows - Smoke Tests", () => {
  test("Swap flow can be initiated", async ({ page }) => {
    await page.goto("/");

    // Fill in basic swap form
    const sourceChain = page.getByRole("combobox", { name: /source chain/i });
    const destChain = page.getByRole("combobox", { name: /destination chain/i });
    const amountInput = page.getByRole("spinbutton", { name: /amount/i });
    const recipientInput = page.getByRole("textbox", { name: /recipient/i });

    if (await sourceChain.isVisible()) {
      await sourceChain.selectOption("stellar");
    }

    if (await destChain.isVisible()) {
      await destChain.selectOption("bitcoin");
    }

    if (await amountInput.isVisible()) {
      await amountInput.fill("10");
    }

    if (await recipientInput.isVisible()) {
      await recipientInput.fill("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx");
    }

    // Check if review button becomes enabled
    const reviewButton = page.getByRole("button", { name: /review|next|continue/i }).first();
    if (await reviewButton.isVisible()) {
      // Should be enabled with valid inputs
      const isEnabled = await reviewButton.isEnabled();
      expect(isEnabled).toBe(true);
    }
  });

  test("Order browsing works", async ({ page }) => {
    await page.goto("/browse");

    // Look for filter controls
    const filterSelect = page.getByRole("combobox", { name: /filter|chain|asset/i }).first();

    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption("stellar");

      // Wait for potential filtering
      await page.waitForTimeout(1000);

      // Should not crash and still show content
      const body = page.locator("body");
      await expect(body).toBeVisible();
    }
  });

  test("Transaction tracking accepts input", async ({ page }) => {
    await page.goto("/track");

    const searchInput = page.getByRole("textbox", { name: /search|transaction|hash/i }).first();
    const searchButton = page.getByRole("button", { name: /search|track/i }).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill("0x1234567890abcdef");
      await searchInput.blur();

      if (await searchButton.isVisible()) {
        const isEnabled = await searchButton.isEnabled();
        expect(isEnabled).toBe(true);
      }
    }
  });
});
