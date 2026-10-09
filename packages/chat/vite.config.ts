import { rpgjsModuleViteConfig } from "@rpgjs/vite";

export default rpgjsModuleViteConfig({
  entries: {
    client: "src/client-index.ts",
    server: "src/server-index.ts",
  },
  declarationIncludes: {
    client: [
      "src/client-index.ts",
      "src/client.ts",
      "src/client-state.ts",
      "src/client-config.ts",
      "src/config.ts",
      "src/client-types.d.ts",
      "src/shared-types.d.ts",
      "src/canvas-engine.d.ts",
    ],
    server: [
      "src/server-index.ts",
      "src/server.ts",
      "src/server-config.ts",
      "src/config.ts",
      "src/server-types.d.ts",
      "src/shared-types.d.ts",
    ],
  },
  copyDtsFiles: true,
});
