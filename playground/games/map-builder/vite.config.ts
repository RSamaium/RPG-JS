import { defineConfig } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";
import playgroundConfig from "./playground.config.json";

export default defineConfig({
  // PixiJS 8.19 imports a CommonJS parser by name from its webworker adapter: Vite has to bundle it for the browser.
  optimizeDeps: { include: ["pixi.js > @xmldom/xmldom"] },
  server: {
    port: playgroundConfig.port,
    strictPort: true,
  },
  plugins: [
    ...rpgjs({
      server: startServer,
      entryPoints: {
        mmorpg: {
          client: "./src/client.ts",
          server: "./src/server.ts",
        },
      },
    }),
  ],
});
