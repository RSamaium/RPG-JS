const path = require('path')
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const nodeExternals = require('webpack-node-externals')
const webpackCommon = require('./webpack-common')
const NodemonPlugin = require('nodemon-webpack-plugin')
const resolveLoader = require('./loaders/resolve')
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')
const { default: WatchExternalFilesPlugin } = require('webpack-watch-files-plugin')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'

const CORE_PACKAGES = [
    '@rpgjs/server',
    '@rpgjs/database'
]

module.exports = function(dirname, extend = {}) {

   const plugins = []

   return {
        target: 'node',
        node: {
            __dirname: false
        },
        externals: [nodeExternals({
            allowlist: ['tiny-worker', /^rpgjs-/, (moduleName => {
                if (moduleName.startsWith('@rpgjs')) {
                    if (CORE_PACKAGES.includes(moduleName)) {
                        return false
                    }
                    return true
                }
                return false
            })]
        })],
        mode,
        entry: `./src/server.ts`,
        context: process.cwd(),
        output: {
            path: path.join(dirname, 'dist/server'),
            filename: 'index.js'
        },
        resolve: {
            extensions: ['.ts', '.js']
        },
        resolveLoader: { 
            alias: resolveLoader('server', 'mmorpg', mode)
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [{
                        loader: require.resolve('ts-loader'),
                        options: {
                            onlyCompileBundledFiles: true,
                            allowTsInNodeModules: true,
                            compilerOptions: {
                                module: "esnext"
                            }
                        }
                    }] 
                },
                ...webpackCommon(dirname)
            ]
        },
        optimization: {
            minimize: false
        },
        plugins: [
            new FriendlyErrorsWebpackPlugin(),
            new WatchExternalFilesPlugin({
                files: [
                  './src/**/*.tmx',
                  './src/**/*.tsx'
                ]
            }),
            new NodemonPlugin({
                script: './dist/server/index.js',
                watch: path.resolve('./dist/server')
            }),
            ...plugins
        ],
        ...extend
    }
}