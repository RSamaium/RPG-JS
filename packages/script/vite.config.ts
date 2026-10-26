import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts"],
      outDirs: "dist",
      aliasesExclude: [/^@rpgjs\//],
      afterDiagnostic(diagnostics) {
        if (diagnostics.length > 0) throw new Error(`Declaration generation failed with ${diagnostics.length} TypeScript diagnostic(s)`);
      },
    }),
  ],
  build: {
    target: "esnext",
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: "src/index.ts",
        "server/index": "src/server/index.ts",
        "core/index": "src/core/index.ts",
        parse: "src/parse.ts",
        "testing/index": "src/testing/index.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [/^@rpgjs\//, "acorn"],
    },
  },
});
