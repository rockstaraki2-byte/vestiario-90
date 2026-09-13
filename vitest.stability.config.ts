import { defineConfig } from "vitest/config";

export default defineConfig({
  test:{
    include:["src/game-engine/**/*.stress.ts"],
    testTimeout:300_000,
  },
});
