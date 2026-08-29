import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      // The pure logic is what these tests exist for. Pages and components are
      // exercised by hand and in the browser, not here, so reporting coverage
      // over them would only produce a number that looks bad for no reason.
      include: [
        "src/lib/coverage.ts",
        "src/lib/risk.ts",
        "src/lib/assessment-input.ts",
        "src/lib/status.ts",
      ],
      reporter: ["text-summary"],
    },
  },
});
