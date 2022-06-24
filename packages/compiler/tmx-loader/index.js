const { TiledParserFile } = require('@rpgjs/tiled')
const fs = require('fs')
const deasync = require('deasync')
const crypto = require('crypto')
const path = require("path")

function parse(text, filepath, callback) {
    const parser = new TiledParserFile(text, path.dirname(filepath))
    parser.parseFile((result) => {
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

module.exports.parse = parse

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
