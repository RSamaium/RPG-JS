import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// List of Node.js built-in modules to mark as external
const nodeBuiltins = [
  'fs', 'path', 'os', 'crypto', 'util', 'events', 'stream', 'buffer', 
  'url', 'querystring', 'http', 'https', 'net', 'tls', 'child_process',
  'cluster', 'dgram', 'dns', 'domain', 'readline', 'repl', 'tty', 'vm',
  'zlib', 'assert', 'constants', 'module', 'perf_hooks', 'process',
  'punycode', 'string_decoder', 'timers', 'trace_events', 'v8', 'worker_threads'
]

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
      entry: {
        index: 'src/index.ts',
        setup: 'src/setup.ts'
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: [/@rpgjs/, 'esbuild', 'canvasengine', '@canvasengine/presets', 'rxjs', 'pixi.js', 'vitest-webgl-canvas-mock'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    },
  },
})
