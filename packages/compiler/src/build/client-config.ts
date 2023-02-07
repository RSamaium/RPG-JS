import { splitVendorChunkPlugin } from 'vite'
import nodePolyfills from 'rollup-plugin-node-polyfills'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { resolve } from 'path'
import requireTransform from 'vite-plugin-require-transform';
import { flagTransform } from './vite-plugin-flag-transform.js';
import vue from '@vitejs/plugin-vue'
import { worldTransformPlugin } from './vite-plugin-world-transform.js';
import fs from 'fs/promises'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { createRequire } from 'module';
import { mapExtractPlugin } from './vite-plugin-map-extract.js';

const require = createRequire(import.meta.url);

interface ClientBuildConfigOptions {
    buildEnd?: () => void,
    serveMode?: boolean,
    plugins?: any[],
    overrideOptions?: any,
    side?: 'client' | 'server',
    mode?: 'development' | 'production',
    type?: 'mmorpg' | 'rpg'
}

export async function clientBuildConfig(dirname: string, options: ClientBuildConfigOptions = {}) {
    const isServer = options.side === 'server'

    let plugins: any[] = [
        flagTransform(options.side || 'client'),
        (requireTransform as any)(),
        worldTransformPlugin(),
        mapExtractPlugin(),
        ...(options.plugins || [])
    ]

    if (!isServer) {
        plugins = [
            ...plugins,
            vue(),
            NodeModulesPolyfillPlugin(),
            NodeGlobalsPolyfillPlugin({
                process: true,
                buffer: true,
            }),
            splitVendorChunkPlugin()
        ]
    }

    let moreBuildOptions = {}

    if (options.buildEnd) {
        plugins.push(options.buildEnd)
    }

    if (options.serveMode && !isServer) {
        moreBuildOptions = {
            watch: {},
            minify: false
        }
    }

    let configFile
    // if found a vite.config.js file, use it
    try {
        const config = await fs.stat(resolve(dirname, 'vite.config.js'))
        if (config.isFile()) {
            configFile = resolve(dirname, 'vite.config.js')
        }
    }
    catch (e) {
        // do nothing
    }

    let aliasTransform = {}

    if (!isServer) {
        const aliasPolyfills = {
            util: 'rollup-plugin-node-polyfills/polyfills/util',
            sys: 'util',
            events: 'rollup-plugin-node-polyfills/polyfills/events',
            stream: 'rollup-plugin-node-polyfills/polyfills/stream',
            path: 'rollup-plugin-node-polyfills/polyfills/path',
            querystring: 'rollup-plugin-node-polyfills/polyfills/qs',
            punycode: 'rollup-plugin-node-polyfills/polyfills/punycode',
            url: 'rollup-plugin-node-polyfills/polyfills/url',
            string_decoder:
                'rollup-plugin-node-polyfills/polyfills/string-decoder',
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

        for (const [key, value] of Object.entries(aliasPolyfills)) {
            aliasTransform[key] = require.resolve(value)
        }

        options.overrideOptions = {
            define: {
                'process.env': {},
                //global: {},
            },
            publicDir: resolve(dirname, 'public'),

        }
    }
    else {
        moreBuildOptions = {
            minify: false,
            ssr: {
                format: 'cjs'
            },
            ...moreBuildOptions,
        }
    }

    const outputPath = resolve(dirname, 'dist', isServer ? 'server' : 'client')
    return {
        mode: options.mode || 'development',
        root: resolve(dirname, 'src'),
        configFile,
        resolve: {
            //mainFields: ['main'],
            alias: {
                '@': 'src',
                ...aliasTransform
            }
        },
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: `@import '@/config/client/theme.scss';`
                }
            }
        },
        assetsInclude: ['**/*.tmx'],
        build: {
            manifest: true,
            outDir: outputPath,
            emptyOutDir: true,
            rollupOptions: {
                output: {
                    dir: outputPath,
                },
                input: {
                    main: !isServer ?
                        resolve(dirname, 'src/index.html') :
                        resolve(dirname, 'src/server.ts')
                },
                plugins: [
                    !isServer ? nodePolyfills() as any : null
                ]
            },
            ...moreBuildOptions
        },
        plugins,
        ...(options.overrideOptions || {})
    }
}