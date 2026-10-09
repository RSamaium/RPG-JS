import { defineConfig } from 'vite'
import canvasengine from '@canvasengine/compiler'
import dts from 'vite-plugin-dts'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    canvasengine(),
    dts({ 
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
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
      entry: {
        index: 'src/index.ts'
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: [/@rpgjs/, 'esbuild', 'canvasengine', '@canvasengine/presets', 'rxjs', 'pixi.js'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    },
  },
})
