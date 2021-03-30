module.exports = function (content) {
    this.cacheable && this.cacheable()
    this.value = content
    return content
}