import { configDefaults, defineConfig } from "vitest/config";
import canvasengine from "@canvasengine/compiler";
import path from "path";

export default defineConfig({
  plugins: [
    canvasengine(),
  ],
  resolve: {
    alias: {
      "@rpgjs/testing": path.resolve(__dirname, "packages/testing/src"),
      "@rpgjs/common": path.resolve(__dirname, "packages/common/src"),
      "@rpgjs/server": path.resolve(__dirname, "packages/server/src"),
      "@rpgjs/physic": path.resolve(__dirname, "packages/physic/src"),
      "@rpgjs/vite": path.resolve(__dirname, "packages/vite/src"),
      "@rpgjs/vue": path.resolve(__dirname, "packages/vue/src"),
      "@rpgjs/action-battle/server": path.resolve(
        __dirname,
        "packages/action-battle/src/server.ts",
      ),
      "@rpgjs/action-battle": path.resolve(__dirname, "packages/action-battle/src"),
      "@common": path.resolve(__dirname, "packages/studio/runtime"),
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      "samples/cloudflare-mmorpg/src/worker.spec.ts",
      "playground/games/studio/src/worker.spec.ts",
    ],
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    globals: true,
    silent: true,
    setupFiles: ["./packages/testing/src/setup.ts"],
    fileParallelism: false,
    hookTimeout: 15000,
    testTimeout: 15000,
  },
});
