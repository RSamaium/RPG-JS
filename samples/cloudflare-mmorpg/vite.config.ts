import { defineConfig, loadEnv } from "vite";
import { rpgjs, tiledMapFolderPlugin } from "@rpgjs/vite";
import serverModule from "./src/server";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (!env.RPGJS_MAP_UPDATE_TOKEN) {
    throw new Error("Copy .env.example to .env.local before starting the sample.");
  }

  return {
    optimizeDeps: {
      include: ['pixi.js > @xmldom/xmldom']
    },
    plugins: [
      tiledMapFolderPlugin({
        sourceFolder: "./src/tiled",
        publicPath: "/map",
        buildOutputPath: "map",
        // The worker compiles TMX/TSX privately. Browsers receive only image
        // assets plus the render/physics chunks sent by the room.
        allowedExtensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
      }),
      ...rpgjs({
        server: serverModule,
        devServer: {
          target: "http://127.0.0.1:8787",
          mapIds: ["demo"],
          mapUpdateToken: env.RPGJS_MAP_UPDATE_TOKEN,
          tiledBasePaths: ["src/tiled"],
        },
        entryPoints: {
          mmorpg: {
            client: "./src/client.ts",
            server: "./src/server.ts"
          }
        }
      })
    ]
  };
});
