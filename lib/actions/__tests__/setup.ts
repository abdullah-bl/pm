import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend Vitest's expect with jest-dom matchers
// Note: @testing-library/jest-dom doesn't have a direct ES module export,
// so we just import cleanup for now
