import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";
import { fixDeclarationSpecifiers } from "../vite/src/esm-declarations";

export default defineConfig({
  plugins: [
    dts({
      afterBuild: fixDeclarationSpecifiers,
      exclude: ["**/*.spec.ts"],
    }),
  ],
  build: {
    lib: {
      entry: { index: resolve(__dirname, "src/index.ts"), pure: resolve(__dirname, "src/pure.ts") },
      formats: ["es"],
    },
    rollupOptions: {
      external: [/^@canvasengine\//, "canvasengine", "pixi.js", "pixi-filters"],
      output: { preserveModules: true, preserveModulesRoot: "src" },
    },
    sourcemap: true,
    minify: false,
    target: "es2020",
  },
});
