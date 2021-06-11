const path = require('path')
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const nodeExternals = require('webpack-node-externals')
const webpackCommon = require('./webpack-common')
const NodemonPlugin = require('nodemon-webpack-plugin')
const resolveLoader = require('./loaders/resolve')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'

module.exports = function(dirname, extend = {}) {

   const plugins = []

   return {
        target: 'node',
        node: {
            __dirname: false
        },
        externals: [nodeExternals({
            allowlist: [/^@rpgjs/]
        })],
        mode,
        entry: `./src/server.ts`,
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
            rules: [{
                    test: /\.ts$/,
                    use: [{
                        loader: require.resolve('ts-loader'),
                        options: {
                            onlyCompileBundledFiles: true,
                            allowTsInNodeModules: true
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
            new CleanWebpackPlugin(),
            new NodemonPlugin({
                script: './dist/server/index.js',
                watch: path.resolve('./dist/server')
            }),
            ...plugins
        ],
        ...extend
    }
}