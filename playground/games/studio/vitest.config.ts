import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        wrangler: { configPath: "./wrangler.test.jsonc" },
        miniflare: {
          bindings: { RPGJS_MAP_UPDATE_TOKEN: "test-map-update-token" },
        },
      },
    },
  },
});
