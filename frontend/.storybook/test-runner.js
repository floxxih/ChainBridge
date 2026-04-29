/**
 * Storybook Test Runner Configuration
 * Configures visual regression testing for component library
 */

const config = {
  // Setup function to run before each story
  setup() {
    // Set viewport size for consistent screenshots
    return {
      viewport: { width: 1280, height: 720 },
    };
  },

  // Hook to run before each story
  async preVisit(page, context) {
    // Wait for fonts to load
    await page.waitForLoadState("networkidle");

    // Wait for any animations to complete
    await page.waitForTimeout(100);

    // Ensure consistent theme
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
    });
  },

  // Hook to run after each story
  async postVisit(page, context) {
    // Take screenshot for visual comparison
    const screenshotPath = `visual-tests/${context.kind}/${context.name}.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
  },

  // Stories to include in visual testing
  stories: {
    include: ["**/*.stories.@(js|jsx|ts|tsx)"],
    exclude: ["**/*.stories.mdx"],
  },

  // Configuration for different viewports
  viewports: [
    { name: "desktop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 668 },
  ],

  // Retry configuration for flaky tests
  retries: 2,

  // Timeout configuration
  timeout: 10000,
};

module.exports = config;
