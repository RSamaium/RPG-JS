import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'

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
      aliasesExclude: [/^@rpgjs\//],
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
        'node/index': 'src/node/index.ts',
        'cloudflare/index': 'src/cloudflare/index.ts'
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: [
        ...nodeBuiltins,
        /^node:/,
        '@signe/room/cloudflare'
      ]
    }
  },
  resolve: {
    alias: {
      '@rpgjs/testing': path.resolve(__dirname, '../testing/src'),
      '@rpgjs/common': path.resolve(__dirname, '../common/src'),
      '@rpgjs/server': path.resolve(__dirname, '../server/src'),
      '@rpgjs/physic': path.resolve(__dirname, '../physic/src'),
      '@rpgjs/vite': path.resolve(__dirname, '../vite/src'),
      '@rpgjs/vue': path.resolve(__dirname, '../vue/src')
    }
  },
  test: {
      environment: 'jsdom',
      setupFiles: ['@rpgjs/testing/dist/setup.js'],
      globals: true
  }
})
