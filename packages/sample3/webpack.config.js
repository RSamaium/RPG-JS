const webpack = require('webpack')
const webpackCompiler = require('@rpgjs/compiler')

const [clientConfig, serverConfig] = webpackCompiler(__dirname)

module.exports = [
    {
        ...clientConfig,
        plugins: [
            ...clientConfig.plugins,
            new webpack.EnvironmentPlugin(['SERVER_URL'])
        ]
    },
    serverConfig
]