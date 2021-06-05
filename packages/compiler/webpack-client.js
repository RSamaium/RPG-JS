const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const WorkboxWebpackPlugin = require("workbox-webpack-plugin")
const WebpackPwaManifest = require('webpack-pwa-manifest')
const webpackCommon = require('./webpack-common')
const PostCompile = require('./sync')
const resolveLoader = require('./loaders/resolve')

const mode = process.env.NODE_ENV || 'development'
const type = process.env.RPG_TYPE || 'mmorpg'
const prod = mode === 'production'
const dir = type == 'mmorpg' ? 'client' : 'standalone'
const isRpg = type == 'rpg'

module.exports = function(dirname, extend = {}) {

    let rpgConfig = {
        title: 'My RPG Game'
    }

    const rpgConfigPath = path.join(dirname, 'rpg.json')
    const plugins = []

    if (fs.existsSync(rpgConfigPath)) {
        rpgConfig = JSON.parse(fs.readFileSync(rpgConfigPath, 'utf-8'))
    }

    if (prod) {
        plugins.push(
            new WorkboxWebpackPlugin.GenerateSW({
                maximumFileSizeToCacheInBytes: 1024 * 1024 * 20 // Mo
            })
        )
        plugins.push(
            new WebpackPwaManifest(rpgConfig)
        )
    }
    else {
        plugins.push(
            new PostCompile({
                baseDir: path.join(dirname, 'dist/standalone'),
                isServer: false,
                isRpg
            })
        )
    }

    return  {
        mode,
        node: {
            fs: 'empty'
        },
        entry: `./src/${ type == 'mmorpg' ? 'client.ts' : 'standalone/index.ts' }`,
        output: {
            path: path.join(dirname, 'dist/' + dir),
            filename: 'bundle.js'
        },
        devtool: prod ? false : 'source-map',
        resolve: {
            alias: {
                'vue$': path.join(dirname, 'node_modules/vue/dist/vue.esm-bundler.js')
            },
            extensions: ['.ts', '.js']
        },
        resolveLoader: { 
            alias: resolveLoader('client', type, mode)
        },
        module: {
            rules: [{
                test: /\.ts$/,
                use: [{
                    loader: require.resolve('ts-loader'),
                    options: {
                        onlyCompileBundledFiles: true,
                        appendTsSuffixTo: [/\.vue$/],
                        allowTsInNodeModules: true
                    }
                }]
    
            }, {
                test: /\.vue$/,
                loader: require.resolve('vue-loader'),
            }, 
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    require.resolve('css-loader')
                ]
            }, {
                test: /\.(png|jpe?g|gif)$/i,
                loader: require.resolve('file-loader'),
                options: {
                    outputPath: 'images',
                    esModule: false
                }
            },
            {
                test: /\.(woff(2)?|ttf|eot|svg)$/i,
                loader: require.resolve('file-loader'),
                options: {
                    outputPath: 'fonts'
                }
            },
            {
                test: /\.(wav|mp3|mpeg|opus|ogg|oga|aac|caf|m4a|m4b|mp4|weba|webm|dolby|flac)$/i,
                loader: require.resolve('file-loader'),
                options: {
                    outputPath: 'sounds',
                    esModule: false
                }
            },
            ...webpackCommon(dirname)
           ]
        },
        optimization: {
            minimize: false
        },
        plugins: [
            new HtmlWebpackPlugin({
                title: rpgConfig.title,
                template: path.join(dirname, 'src/index.html')
            }),
            new MiniCssExtractPlugin({
                filename: 'style.css'
            }),
            new VueLoaderPlugin(),
            new webpack.DefinePlugin({
                __VUE_OPTIONS_API__: true,
                __VUE_PROD_DEVTOOLS__: false,
                __RPGJS_PRODUCTION__: JSON.stringify(prod),
                __RPGJS_MMORPG__: JSON.stringify(type == 'mmorpg')
            }),
            ...plugins
        ],
        ...extend
    }
}