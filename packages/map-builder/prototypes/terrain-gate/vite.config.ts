import { defineConfig } from "vite";

// Throwaway page for the terrain gate: `pnpm dlx vite --config prototypes/terrain-gate/vite.config.ts`.
export default defineConfig({
  root: __dirname,
  server: { port: 5193, strictPort: true, fs: { allow: ["../../../.."] } },
  worker: { format: "es" },
  optimizeDeps: { include: ["pixi.js > @xmldom/xmldom"] },
});
