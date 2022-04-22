const path = require('path')

module.exports = function (dirname) {
    return [{
        test: /\.tmx$/i,
        use: [{
            loader: require.resolve('file-loader'),
            options: {
                outputPath(url) {
                    return `maps/${url.replace(/.tmx$/, '.json')}`
                },
                name: '[contenthash].[name].[ext]',
                esModule: false
            }
        }, {
            loader: path.resolve(__dirname, 'tmx-loader', 'index.js')
        }]
    }, {
        test: /\.world$/i,
        use: [{
            loader: path.resolve(__dirname, 'tmx-loader', 'world-loader.js')
        }]
    }]
}