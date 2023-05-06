import { splitVendorChunkPlugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import toml from '@iarna/toml';
import nodePolyfills from 'rollup-plugin-node-polyfills'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { resolve } from 'path'
import requireTransform from './vite-plugin-require.js';
import { flagTransform } from './vite-plugin-flag-transform.js';
import vue from '@vitejs/plugin-vue'
import { worldTransformPlugin } from './vite-plugin-world-transform.js';
import fs from 'fs/promises'
import _fs from 'fs'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { createRequire } from 'module';
import { mapExtractPlugin } from './vite-plugin-map-extract.js';
import { tsxXmlPlugin } from './vite-plugin-tsx-xml.js';
import { tmxTsxMoverPlugin } from './vite-plugin-tmx-tsx-mover.js';
import { DevOptions } from '../serve/index.js';
import { codeInjectorPlugin } from './vite-plugin-code-injector.js';
import { error, ErrorCodes } from '../utils/log.js';
import configTomlPlugin from './vite-plugin-config.toml.js'
import { createDistFolder, entryPointServer } from './utils.js'
import cssPlugin from './vite-plugin-css.js';
import { rpgjsPluginLoader } from './vite-plugin-rpgjs-loader.js';
import { mapUpdatePlugin } from './vite-plugin-map-update.js';

const require = createRequire(import.meta.url);

export interface Config {
    modules?: string[]
    startMap?: string
    name?: string
    shortName?: string,
    description?: string,
    themeColor?: string,
    icons?: {
        src: string,
        sizes: string,
        type: string
    }[]
    themeCss?: string
    inputs?: any
    start?: {
        map?: string,
        graphic?: string
        hitbox?: [number, number]
    }
    spritesheetDirectories?: string[]
}

export interface ClientBuildConfigOptions {
    buildEnd?: () => void,
    serveMode?: boolean,
    plugins?: any[],
    overrideOptions?: any,
    side?: 'client' | 'server',
    mode?: 'development' | 'production' | 'test',
    type?: 'mmorpg' | 'rpg',
    server?: DevOptions,
    plugin?: {
        entry: string,
    },
    optimizeDepsExclude?: string[]
}

export async function clientBuildConfig(dirname: string, options: ClientBuildConfigOptions = {}) {
    const isServer = options.side === 'server'
    const isTest = options.mode === 'test'
    const isRpg = options.type === 'rpg'
    const isBuild = options.serveMode === false
    const dirOutputName = isRpg ? 'standalone' : 'client'
    const plugin = options.plugin
    const serverUrl = 'http://' + process.env.VITE_SERVER_URL
    let config: Config = {}

    const envType = process.env.RPG_TYPE
    if (envType && !['rpg', 'mmorpg'].includes(envType)) {
        throw new Error('Invalid type. Choice between rpg or mmorpg')
    }

    const tomlFile = resolve(process.cwd(), 'rpg.toml')
    const jsonFile = resolve(process.cwd(), 'rpg.json')
    // if file exists
    if (_fs.existsSync(tomlFile)) {
        config = toml.parse(await fs.readFile(tomlFile, 'utf8'));
    }
    else if (_fs.existsSync(jsonFile)) {
        config = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
    }

    if (options.mode != 'test' && !plugin) {
        // if index.html is not found, display an error
        try {
            await fs.stat(resolve(dirname, 'index.html'))
        }
        catch (e: any) {
            error(e, ErrorCodes.IndexNotFound)
            return
        }
    }

    // alias for client
    process.env.VITE_RPG_TYPE = envType

    await createDistFolder(dirOutputName)

    let plugins: any[] = [
        rpgjsPluginLoader(dirOutputName, options.serveMode),
        flagTransform(options),
        configTomlPlugin(options, config), // after flagTransform
        (requireTransform as any)(),
        worldTransformPlugin(isRpg ? undefined : serverUrl),
        tsxXmlPlugin(),
        ...(options.plugins || [])
    ]

    if (!isServer) {
        plugins = [
            ...plugins,
            vue(),
            cssPlugin(config),
            codeInjectorPlugin(),
            NodeModulesPolyfillPlugin(),
            NodeGlobalsPolyfillPlugin({
                process: true,
                buffer: true,
            }),
            splitVendorChunkPlugin(),
        ]
        if (isBuild) {
            plugins.push(
                VitePWA({
                    manifest: {
                        name: config.name,
                        short_name: config.shortName,
                        description: config.description,
                        theme_color: config.themeColor,
                        icons: config.icons
                    }
                })
            )
        }
    }
    else {
        if (!isBuild) {
            plugins.push(
                mapUpdatePlugin(isRpg ? undefined : serverUrl)
            )
        }
    }

    if (isBuild && !isTest) {
        plugins.push(
            tmxTsxMoverPlugin(isRpg ? 'standalone' : 'server'),
            mapExtractPlugin(dirOutputName)
        )
    }

    let moreBuildOptions = {}
    let outputOptions = {}

    if (options.buildEnd) {
        plugins.push(options.buildEnd)
    }

    if (options.serveMode) {
        if (!isServer) {
            moreBuildOptions = {
                watch: {},
                minify: false
            }
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
            process: 'rollup-plugin-node-polyfills/polyfills/process-es6',
            ...(
                options.mode != 'test' ? {
                    buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6'
                } : {}
            )
        }

        for (const [key, value] of Object.entries(aliasPolyfills)) {
            aliasTransform[key] = require.resolve(value)
        }

        options.overrideOptions = {
            ...options.overrideOptions,
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
        if (!options.serveMode) {
            outputOptions = {
                format: 'cjs',
            }
        }
    }

    // TODO, minify is rpg mode but currently not working
    if (isBuild) {
        moreBuildOptions = {
            minify: false,
            ...moreBuildOptions,
        }
    }

    const outputPath = isRpg ?
        resolve(dirname, 'dist', dirOutputName) :
        resolve(dirname, 'dist', isServer ? 'server' : dirOutputName)
    const viteConfig = {
        mode: options.mode || 'development',
        root: '.',
        configFile,
        resolve: {
            alias: {
                '@': 'src',
                ...aliasTransform
            },
            extensions: ['.ts', '.js', '.jsx', '.json', '.vue', '.css', '.scss', '.sass', '.html', 'tmx', 'tsx', '.toml'],
        },
        assetsInclude: ['**/*.tmx', '**/*.tsx'],
        server: options.server,
        logLevel: options.server?.loglevel,
        debug: options.server?.debug,
        build: {
            manifest: true,
            outDir: outputPath,
            chunkSizeWarningLimit: 10000,
            assetsInlineLimit: 0,
            emptyOutDir: false,
            rollupOptions: {
                output: {
                    dir: outputPath,
                    assetFileNames: (assetInfo) => {
                        let extType = assetInfo.name.split('.').at(1);
                        if (/tmx|tsx/i.test(extType)) {
                            return `assets/[name][extname]`;
                        }
                        return `assets/[name]-[hash][extname]`;
                    },
                    ...outputOptions
                },
                input: {
                    main: plugin ? plugin.entry :
                        !isServer ?
                            resolve(dirname, 'index.html') :
                            entryPointServer()
                },
                plugins: [
                    !isServer ? nodePolyfills() as any : null
                ]
            },
            ...moreBuildOptions
        },
        plugins,
        ...(options.overrideOptions || {}),
    }

    viteConfig.optimizeDeps = {
        ...viteConfig.optimizeDeps,
        exclude: [
            ...(options.optimizeDepsExclude || [])
        ],
    }

    return viteConfig
}