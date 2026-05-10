import { defineConfig } from "vite";
import { compatibilityV4Plugin } from "@rpgjs/vite";
import path from "path";

export default defineConfig({
  plugins: [
    ...compatibilityV4Plugin({
      type: "rpg"
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});

