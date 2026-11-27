import { rpgjsModuleViteConfig } from "@rpgjs/vite";

export default rpgjsModuleViteConfig({
  entries: { client: "src/client-index.ts", server: "src/server-index.ts" },
});
