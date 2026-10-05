import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/__fixtures__/**"],
      outDirs: "dist",
      afterDiagnostic(diagnostics) {
        if (diagnostics.length > 0) {
          throw new Error(`Declaration generation failed with ${diagnostics.length} diagnostic(s)`);
        }
      },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: "src/index.ts",
        "model/index": "src/model/index.ts",
        "renderer/index": "src/renderer/index.ts",
        "features/index": "src/features/index.ts",
        "interaction/index": "src/interaction/index.ts",
        "skins/index": "src/skins/index.ts",
        "protocol/index": "src/protocol/index.ts",
        "authority/index": "src/authority/index.ts",
        "remote/index": "src/remote/index.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ["pixi.js"],
      output: { preserveModules: true, preserveModulesRoot: "src" },
    },
  },
});
