import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { fixDeclarationSpecifiers } from "../vite/src/esm-declarations";

export default defineConfig({
  plugins: [
    dts({ 
      afterBuild: fixDeclarationSpecifiers,
      include: ['src/**/*.ts'],
      outDirs: 'dist',
      afterDiagnostic(diagnostics) {
        if (diagnostics.length > 0) throw new Error(`Declaration generation failed with ${diagnostics.length} TypeScript diagnostic(s)`)
      }
    })
  ],
  build: {
    target: 'esnext',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      // One copy of the reactive runtime for the whole application: a `batch()` only defers the computed signals of
      // its own copy of `@signe/reactive`, and signals of two copies do not track each other.
      external: [/^@signe\//, 'rxjs', /^rxjs\//]
    }
  },
})
