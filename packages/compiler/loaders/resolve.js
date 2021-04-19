const path = require('path')

/**
 * 
 * @param {string} side server or client
 * @param {string} type rpg or mmorpg
 * @param {string} env development or production
 * @returns object
 */
module.exports = function(side, type, env) {
    const p  = file => path.resolve(__dirname, file)
    return { 
        server: p(`${side == 'server' || type == 'rpg' ? 'content' : 'null'}.js`),
        client: p(`${side == 'client' || type == 'rpg' ? 'content' : 'null'}.js`),
        rpg: p(`${type == 'rpg' ? 'content' : 'null'}.js`),
        mmorpg: p(`${type == 'mmorpg' ? 'content' : 'null'}.js`),
        development: p(`${env == 'development' ? 'content' : 'null'}.js`),
        production: p(`${env == 'production' ? 'content' : 'null'}.js`)
    } 
}