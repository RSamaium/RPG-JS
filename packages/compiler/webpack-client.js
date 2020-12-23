const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const webpackCommon = require('./webpack-common')

const mode = process.env.NODE_ENV || 'development'
const type = process.env.RPG_TYPE || 'mmorpg'
const prod = mode === 'production'
const dir = type == 'mmorpg' ? 'client' : 'standalone'

module.exports = function(dirname, extend = {}) {
    return  {
        mode,
        node: {
            fs: 'empty'
        },
        entry: `./src/${ type == 'mmorpg' ? 'client/main.ts' : 'standalone/index.ts' }`,
        output: {
            path: path.join(dirname, 'dist/' + dir),
            filename: 'bundle.js'
        },
        devtool: prod ? false : 'source-map',
        resolve: {
            alias: {
                'vue$': 'vue/dist/vue.esm.js'
            },
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [{
                test: /\.ts$/,
                use: [{
                    loader: require.resolve('ts-loader'),
                    options: {
                        onlyCompileBundledFiles: true,
                        appendTsSuffixTo: [/\.vue$/]
                    }
                }]
    
            }, {
                test: /\.vue$/,
                loader: require.resolve('vue-loader')
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
                template: path.join(dirname, 'src/client/index.html')
            }),
            new MiniCssExtractPlugin({
                filename: 'style.css'
            }),
            new VueLoaderPlugin()
        ],
        ...extend
    }
}