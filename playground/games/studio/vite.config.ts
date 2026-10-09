import { defineConfig, loadEnv } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";
import playgroundConfig from "./playground.config.json";
import { createStudioMapUpdatePayload } from "@rpgjs/studio/server";
import { studio } from "./src/config/config.common";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isCloudflare = process.env.RPGJS_SERVER_ADAPTER === "cloudflare";
  if (isCloudflare && !env.RPGJS_MAP_UPDATE_TOKEN) {
    throw new Error("Copy .env.example to .env.local before starting Studio on Cloudflare.");
  }

  return {
    optimizeDeps: {
      include: ["pixi.js > @xmldom/xmldom"],
    },
    server: {
      port: playgroundConfig.port,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:5173",
          changeOrigin: true,
        },
      },
    },
    plugins: [
      ...rpgjs({
        server: startServer,
        devServer: isCloudflare
          ? {
              target: "http://127.0.0.1:8787",
              mapIds: [studio.startMapId],
              mapUpdateToken: env.RPGJS_MAP_UPDATE_TOKEN,
              resolveMapPayload: ({ mapId }) => createStudioMapUpdatePayload(mapId, studio),
            }
          : undefined,
        entryPoints: {
          rpg: "./src/standalone.ts",
          mmorpg: {
            client: "./src/client.ts",
            server: "./src/server.ts",
            adapters: {
              cloudflare: "./src/entries/cloudflare.ts",
            },
          },
        },
      }),
    ],
  };
});
