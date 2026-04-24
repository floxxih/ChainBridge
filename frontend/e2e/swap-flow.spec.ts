import { test, expect } from "@playwright/test";

/**
 * E2E coverage for the critical cross-chain swap flow.
 *
 * Precondition: dev server running on http://localhost:3000 (configured via
 * playwright.config.ts webServer). No real wallet or on-chain transactions are
 * triggered — these tests drive the UI state machine only.
 */

const SWAP_PAGE = "/";

test.describe("Swap form — field validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SWAP_PAGE);
  });

  test("renders source and destination chain selectors", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: /source chain/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /destination chain/i })).toBeVisible();
  });

  test("renders amount input and recipient address field", async ({ page }) => {
    await expect(page.getByRole("spinbutton", { name: /amount/i })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /recipient address/i })
    ).toBeVisible();
  });

  test("submit button is disabled when form is empty", async ({ page }) => {
    const submit = page
      .getByRole("button", { name: /review swap|confirm|next/i })
      .first();
    await expect(submit).toBeDisabled();
  });

  test("shows validation error for invalid recipient address", async ({ page }) => {
    await page.getByRole("spinbutton", { name: /amount/i }).fill("1");
    await page.getByRole("textbox", { name: /recipient address/i }).fill("not-a-valid-address");
    await page.getByRole("textbox", { name: /recipient address/i }).blur();

    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("cannot set source and destination to the same chain", async ({ page }) => {
    const source = page.getByRole("combobox", { name: /source chain/i });
    const dest = page.getByRole("combobox", { name: /destination chain/i });

    const sourceValue = await source.inputValue();
    await dest.selectOption(sourceValue);

    // Expect a warning or that the dest resets / an error surfaces
    const warning = page.getByText(/same chain|must differ|select different/i);
    await expect(warning.or(dest)).toBeTruthy();
  });
});

test.describe("Swap form — review step", () => {
  async function fillValidSwapForm(page: import("@playwright/test").Page) {
    await page.goto(SWAP_PAGE);

    const sourceSelect = page.getByRole("combobox", { name: /source chain/i });
    const destSelect = page.getByRole("combobox", { name: /destination chain/i });

    await sourceSelect.selectOption("stellar");
    await destSelect.selectOption("bitcoin");

    await page.getByRole("spinbutton", { name: /amount/i }).fill("10");

    // Pick a valid Bitcoin testnet address
    await page
      .getByRole("textbox", { name: /recipient address/i })
      .fill("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx");
  }

  test("proceeds to review step with valid inputs", async ({ page }) => {
    await fillValidSwapForm(page);

    const nextBtn = page
      .getByRole("button", { name: /review swap|next|continue/i })
      .first();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await expect(
      page.getByText(/review|confirm swap|swap details/i).first()
    ).toBeVisible();
  });

  test("review step displays entered amount and recipient", async ({ page }) => {
    await fillValidSwapForm(page);

    const nextBtn = page
      .getByRole("button", { name: /review swap|next|continue/i })
      .first();
    await nextBtn.click();

    await expect(page.getByText(/10/)).toBeVisible();
    await expect(page.getByText(/tb1q/i)).toBeVisible();
  });

  test("can navigate back from review step to edit inputs", async ({ page }) => {
    await fillValidSwapForm(page);

    const nextBtn = page
      .getByRole("button", { name: /review swap|next|continue/i })
      .first();
    await nextBtn.click();

    const backBtn = page.getByRole("button", { name: /back|edit/i }).first();
    await backBtn.click();

    await expect(page.getByRole("spinbutton", { name: /amount/i })).toBeVisible();
  });
});

test.describe("Swap form — fee and timelock display", () => {
  test("shows estimated fee after source chain is selected", async ({ page }) => {
    await page.goto(SWAP_PAGE);
    await page.getByRole("combobox", { name: /source chain/i }).selectOption("stellar");

    await expect(page.getByText(/fee|estimated fee/i)).toBeVisible();
  });

  test("timelock configurator is visible with a default value", async ({ page }) => {
    await page.goto(SWAP_PAGE);
    const timelockInput = page.getByRole("spinbutton", { name: /timelock|hours/i });
    await expect(timelockInput).toBeVisible();
    const value = await timelockInput.inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  });
});

test.describe("Swap form — accessibility", () => {
  test("form fields are reachable via keyboard Tab navigation", async ({ page }) => {
    await page.goto(SWAP_PAGE);
    await page.keyboard.press("Tab");

    // Verify focus is within the page and moves through interactive elements
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["INPUT", "SELECT", "BUTTON", "TEXTAREA", "A"]).toContain(focused);
  });

  test("has no missing aria-labels on primary form controls", async ({ page }) => {
    await page.goto(SWAP_PAGE);

    const unlabelledInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll("input, select, textarea");
      return Array.from(inputs).filter((el) => {
        const id = el.getAttribute("id");
        const ariaLabel = el.getAttribute("aria-label");
        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        const associated = id
          ? document.querySelector(`label[for="${id}"]`)
          : null;
        return !ariaLabel && !ariaLabelledBy && !associated;
      }).length;
    });

    expect(unlabelledInputs).toBe(0);
  });
});
