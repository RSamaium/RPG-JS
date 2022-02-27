const configServer = require('./webpack-server')
const configClient = require('./webpack-client')

module.exports = function(path, { extendClient, extendServer, envsClient } = {}) {
  const isRpg = process.env.RPG_TYPE == 'rpg'
  const configs = [configClient(path, extendClient, envsClient)]

  if (!isRpg) {
    configs.push(configServer(path, extendServer))
  }

  return configs
}