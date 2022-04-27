const webpack = require('@rpgjs/compiler')

module.exports = webpack(__dirname, {
    envsClient: ['MATCH_MAKER_URL']
})