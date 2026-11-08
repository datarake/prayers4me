import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/globalSetup.ts"],
    // One shared throwaway database, so test files run one after another.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
