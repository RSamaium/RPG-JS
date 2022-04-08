module.exports = function worldLoader(text, map, meta) {
    this.cacheable()
    const callback = this.async()
    const json = text.replace(/("[a-zA-Z0-9-_\.]+\.tmx")/gi, 'require($1)')
    const js = `module.exports = ${json}`
    callback(null, js, map, meta)
}