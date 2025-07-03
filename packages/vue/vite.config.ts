import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    dts({ 
      include: ['src/**/*.ts'],
      outDir: 'dist'
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