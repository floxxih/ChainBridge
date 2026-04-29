/**
 * Visual Regression Testing Configuration
 * Configures Chromatic for visual testing in CI/CD
 */

module.exports = {
  // Project token for Chromatic (should be set in CI environment)
  projectToken: process.env.CHROMATIC_PROJECT_TOKEN,

  // Build Storybook before running tests
  buildScriptName: "build-storybook",

  // Only run on specific branches to save CI minutes
  onlyChanged: true,

  // Auto-accept changes for specific patterns
  autoAcceptChanges: "src/**/__tests__/**/*",

  // Exit with zero code when changes are detected (for local development)
  exitZeroOnChanges: process.env.NODE_ENV !== "ci",

  // Output configuration
  output: "chromatic-results",

  // Skip stories that match these patterns
  skip: ["**/*.stories.mdx", "**/examples/**"],

  // Custom CSS injection for consistent testing
  css: `
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
    }
  `,
};
