const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const nodeExternals = require('webpack-node-externals')

const mode = process.env.NODE_ENV || 'development'

module.exports = {
    target: 'node',
    node: {
        __dirname: false
    },
    externals: [nodeExternals({
        //allowlist: ['@rpgjs/default-gui', '@rpgjs/starter-kit-server', '@rpgjs/starter-kit-client']
        allowlist: [/^@rpgjs/, 'lance-gg']
    })],
    mode,
    entry: `./src/server/main.ts`,
    output: {
        path: path.join(__dirname, 'dist/server'),
        filename: 'index.js'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            use: [{
                loader: 'ts-loader',
                options: {
                    onlyCompileBundledFiles: true
                }
            }],
            exclude: [/node_modules/]
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
        new CleanWebpackPlugin()
    ]
}