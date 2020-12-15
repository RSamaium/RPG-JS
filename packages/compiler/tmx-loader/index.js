const tmx = require('tmx-parser')
const deasync = require('deasync')

function parse(text, filepath, callback) {
    tmx.parse(text, filepath, (err, result) => {
        if (err) return callback(err)
        for (let layer of result.layers) {
            delete layer.map
        }
        callback(null, result)
    })
}

module.exports = function loader(text, map, meta) {
    this.cacheable()
    const callback = this.async()
    parse(text, this.resourcePath, (err, result) => {
        if (err) return callback(err)
        callback(null, JSON.stringify(result), map, meta)
    })
}

module.exports.process = function (text, filepath) {
    let result
    parse(text, filepath, (err, ret) => {
        if (err) throw err
        result = ret
    })
    while (result === undefined) {
        deasync.runLoopOnce();
    }
    return `module.exports = ${JSON.stringify(result)};`;
}
