import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    dts({ 
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
      external: [/@rpgjs/, 'vue', 'rxjs'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    },
  },
})
