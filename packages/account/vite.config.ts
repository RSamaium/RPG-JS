import { rpgjsModuleViteConfig } from "@rpgjs/vite";

export default rpgjsModuleViteConfig({
  entries: { client: "src/client-index.ts" },
  declarationIncludes: {
    client: [
      "src/client-index.ts",
      "src/client.ts",
      "src/client-state.ts",
      "src/client-config.ts",
      "src/config.ts",
      "src/client-types.d.ts",
      "src/client-validation.ts",
      "src/recovery.ts",
      "src/canvas-engine.d.ts",
    ],
  },
  copyDtsFiles: true,
});
