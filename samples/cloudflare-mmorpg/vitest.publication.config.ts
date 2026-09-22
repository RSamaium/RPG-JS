import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
export default defineWorkersConfig({
  test: {
    include: ['src/publication-worker.spec.ts'],
    poolOptions: {
      workers: {
        isolatedStorage: false,
        wrangler: { configPath: './wrangler.publication-test.jsonc' },
        miniflare: { bindings: { RPGJS_MAP_UPDATE_TOKEN: 'test-map-update-token' } },
      },
    },
  },
});
