const configServer = require('./webpack-server')
const configClient = require('./webpack-client')

module.exports = function(path, { extendClient, extendServer } = {}) {
  const isRpg = process.env.RPG_TYPE == 'rpg'
  const configs = [configClient(path, extendClient)]

  if (!isRpg) {
    configs.push(configServer(path, extendServer))
  }

  return configs
}