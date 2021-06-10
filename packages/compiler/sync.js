const bs = require('browser-sync').create()

class PostCompile {
    constructor(options) {
        this.port = process.env.PORT || 3000
        this.isServer = options.isServer
        this.baseDir = options.baseDir
        this.isRpg = options.isRpg
    }
    apply(compiler) {
        compiler.hooks.done.tap('post-compile', () => {
            if (!bs.active) {
                if (this.isRpg) {
                    bs.init({
                        host: 'localhost',       
                        port: this.port,
                        server: { baseDir: [this.baseDir] }
                    })
                    return
                }
                if (this.isServer) {
                    bs.init({
                        host: 'localhost',       
                        port: this.port + 1,
                        proxy: {
                            target: 'http://localhost:' + this.port,
                            ws: true
                        }
                    })
                }
            }
            else {
                if (!this.isServer) bs.reload()
            }
        })
    }
}

module.exports = PostCompile