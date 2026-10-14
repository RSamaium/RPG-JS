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
      "src/client-view.ts",
      "src/client-types.ts",
      "src/config.ts",
      "src/dates.ts",
      "src/events.ts",
      "src/service.ts",
      "src/server-types.ts",
      "src/shared-types.ts",
    ],
    server: [
      "src/server-index.ts",
      "src/server.ts",
      "src/service.ts",
      "src/dates.ts",
      "src/events.ts",
      "src/config.ts",
      "src/server-types.ts",
      "src/shared-types.ts",
    ],
  },
  copyDtsFiles: true,
});
