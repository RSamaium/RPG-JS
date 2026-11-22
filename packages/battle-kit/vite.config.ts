import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";
import { fixDeclarationSpecifiers } from "../vite/src/esm-declarations";

export default defineConfig({
  plugins: [
    dts({
      afterBuild: fixDeclarationSpecifiers,
      exclude: ["**/*.spec.ts"],
      afterDiagnostic(diagnostics) {
        if (diagnostics.length > 0) throw new Error(`Declaration generation failed with ${diagnostics.length} TypeScript diagnostic(s)`);
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        pure: resolve(__dirname, "src/pure.ts"),
        server: resolve(__dirname, "src/server.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [/^@canvasengine\//, /^@rpgjs\//, "canvasengine", "pixi.js", "pixi-filters", "rxjs"],
      output: { preserveModules: true, preserveModulesRoot: "src" },
    },
    sourcemap: true,
    minify: false,
    target: "es2020",
  },
});
