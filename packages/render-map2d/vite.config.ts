import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts"],
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
    lib: { entry: { index: "src/index.ts" }, formats: ["es"], fileName: (_format, entryName) => `${entryName}.js` },
    rollupOptions: { output: { preserveModules: true, preserveModulesRoot: "src" } },
  },
});
