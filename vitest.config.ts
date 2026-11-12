import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/**/*.test.ts",
      "backend/**/*.test.ts",
      "frontend/**/*.test.ts",
      "frontend/**/*.test.tsx",
    ],
  },
});
