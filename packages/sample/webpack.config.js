const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

const mode = process.env.NODE_ENV || 'development'
const type = process.env.GAME_TYPE || 'mmorpg'
const prod = mode === 'production'
const dir = type == 'mmorpg' ? 'client' : 'standalone'

module.exports = {
    mode,
    node: {
        fs: 'empty'
    },
    entry: `./src/${ type == 'mmorpg' ? 'client/main.ts' : 'standalone/index.ts' }`,
    output: {
        path: path.join(__dirname, 'dist/' + dir),
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
                loader: 'ts-loader',
                options: {
                    onlyCompileBundledFiles: true,
                    appendTsSuffixTo: [/\.vue$/]
                }
            }]

        }, {
            test: /\.vue$/,
            loader: 'vue-loader'
        }, 
        {
            test: /\.css$/,
            use: [
                MiniCssExtractPlugin.loader,
                'css-loader'
            ]
        }, {
            test: /\.(png|jpe?g|gif)$/i,
            loader: 'file-loader',
            options: {
                outputPath: 'images',
                esModule: false
            }
        },
        {
            test: /\.(woff(2)?|ttf|eot|svg)$/i,
            loader: 'file-loader',
            options: {
                outputPath: 'fonts'
            }
        },
        {
            test: /\.efk$/i,
            loader: 'file-loader',
            options: {
                outputPath: 'animations',
                esModule: false
            }
        }, 
        {
            test: /\.tmx$/i,
            use: [
                {
                    loader: 'file-loader',
                    options: {
                        outputPath(url)  {
                            return `maps/${url.replace(/.tmx$/, '.json')}`
                        },
                        esModule: false
                    }
                },  {
                    loader: 'tmx-loader'
                }]
            }]
    },
    optimization: {
        minimize: false
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'src/client/index.html')
        }),
        new MiniCssExtractPlugin({
            filename: 'style.css'
        }),
        new VueLoaderPlugin()
    ]
}