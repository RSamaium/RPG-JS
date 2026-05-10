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
      external: [
        // Mark all Node.js built-in modules as external
        ...nodeBuiltins,
        // Also mark any module that starts with 'node:' as external
        /^node:/,
        // Mark vite as external since it's a peer dependency
        'vite',
        'vite-plugin-dts',
        '@canvasengine/compiler',
        '@iarna/toml',
        'image-size',
        '@babel/parser',
        '@babel/traverse',
        '@babel/generator',
        '@babel/types',
        'chokidar',
        'ws'
      ]
    }
  },
})
