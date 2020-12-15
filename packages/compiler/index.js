const configServer = require('./webpack-server')
const configClient = require('./webpack-client')

const side = process.env.RPG_SIDE

module.exports = function(path, { extendClient, extendServer } = {}) {
  //  return side == 'server' ? configServer(path, extendServer) : configClient(path, extendClient)
  return [
    configClient(path, extendClient),
    configServer(path, extendServer)
  ]
}