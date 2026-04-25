import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/hooks/**/*.ts",
    "src/lib/**/*.ts",
    "src/components/**/*.tsx",
    "!src/**/*.stories.*",
  ],
};

export default createJestConfig(config);
