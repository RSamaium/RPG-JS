import { defineConfig } from 'vite'

const methodsFs = ['existsSync', 'readFileSync', 'readdirSync', 'copyFileSync']
const mockFs = `
    export default {
        ${
            methodsFs.map(method => `${method}: (...args) => window.fs.${method}(...args),`).join('\n')
        }
    }
`

const mockImageSize = `
    export default (imagePath) => {
        return window.imagesLoaded[imagePath]
    }
`

const picocolorsMock = `
    export default {
        yellow: (message) => message,
        blue: (message) => message,
        red: (message) => message,
        dim: (message) => message
    }
`

function viteMockPlugin() {
    return {
        enforce: 'pre',
        name: 'vite:mock',
        load(id: string) {
            if (id.includes('image-size')) {
                return mockImageSize
            }
            if (id === 'fs' || id === 'fs/promises') {
                return mockFs
            }
            if (id === 'picocolors') {
                return picocolorsMock
            }
            if (id === 'vite') {
                return `export const loadEnv = () => {}`
            }
            if (id === 'glob') {
                return `export const sync = () => []`
            }
        },
        resolveId(source: string) {
            if (['fs', 'picocolors', 'vite', 'fs/promises', 'glob'].includes(source)) {
                return source;
            }
        }
    }
}

const aliasPolyfills = {
    util: 'rollup-plugin-node-polyfills/polyfills/util',
    sys: 'util',
    events: 'rollup-plugin-node-polyfills/polyfills/events',
    stream: 'rollup-plugin-node-polyfills/polyfills/stream',
    path: 'rollup-plugin-node-polyfills/polyfills/path',
    querystring: 'rollup-plugin-node-polyfills/polyfills/qs',
    punycode: 'rollup-plugin-node-polyfills/polyfills/punycode',
    url: 'rollup-plugin-node-polyfills/polyfills/url',
    string_decoder: 'rollup-plugin-node-polyfills/polyfills/string-decoder',
    http: 'rollup-plugin-node-polyfills/polyfills/http',
    https: 'rollup-plugin-node-polyfills/polyfills/http',
    os: 'rollup-plugin-node-polyfills/polyfills/os',
    assert: 'rollup-plugin-node-polyfills/polyfills/assert',
    constants: 'rollup-plugin-node-polyfills/polyfills/constants',
    _stream_duplex:
        'rollup-plugin-node-polyfills/polyfills/readable-stream/duplex',
    _stream_passthrough:
        'rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough',
    _stream_readable:
        'rollup-plugin-node-polyfills/polyfills/readable-stream/readable',
    _stream_writable:
        'rollup-plugin-node-polyfills/polyfills/readable-stream/writable',
    _stream_transform:
        'rollup-plugin-node-polyfills/polyfills/readable-stream/transform',
    timers: 'rollup-plugin-node-polyfills/polyfills/timers',
    console: 'rollup-plugin-node-polyfills/polyfills/console',
    vm: 'rollup-plugin-node-polyfills/polyfills/vm',
    zlib: 'rollup-plugin-node-polyfills/polyfills/zlib',
    tty: 'rollup-plugin-node-polyfills/polyfills/tty',
    domain: 'rollup-plugin-node-polyfills/polyfills/domain',
    process: 'rollup-plugin-node-polyfills/polyfills/process-es6'
}

export default defineConfig({
    build: {
        outDir: 'browser',
        lib: {
            entry: 'src/browser.ts',
            name: 'RpgCompiler',
            fileName: 'rpg.compiler',
        },
    },
    resolve: {
        alias: {
            ...aliasPolyfills,
        }
    },
    plugins: [
        viteMockPlugin() as any
    ]
})