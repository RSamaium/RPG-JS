const tmx = require('tmx-parser')
const fs = require('fs')
const deasync = require('deasync')
const crypto = require('crypto')
const path = require("path")

function parse(text, filepath, callback) {
    const type = process.env.RPG_TYPE == 'rpg' ? 'standalone' : 'client'
    tmx.parse(text, filepath, (err, result) => {
        if (err) return callback(err)
        for (let layer of result.layers) {
            if (layer.image) {
                const source = layer.image.source
                const hash = crypto.createHash('md5').update(source).digest("hex")
                const ext = path.extname(source)
                const urlName = `/images/${hash}${ext}`
                const target = path.join(path.dirname(filepath), source);
                const imageContent = fs.readFileSync(target)
                const rootDir = process.cwd()
                fs.writeFileSync(`${rootDir}/dist/${type}` + urlName, imageContent)
                layer.image.source = urlName
            }
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
