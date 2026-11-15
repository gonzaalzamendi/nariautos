import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30000, fileParallelism: false, setupFiles: ["tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/vacio.ts") } },
});
