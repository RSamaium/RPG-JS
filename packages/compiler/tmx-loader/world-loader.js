const { parse } = require('./index')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

module.exports = async function worldLoader(text, sourcemap, meta) {
   /* const type = process.env.RPG_TYPE == 'rpg' ? 'standalone' : 'server'
    const filepath = this.resourcePath
    this.cacheable()
    const callback = this.async()
    const json = JSON.parse(text)
    const p = []
    const rootDir = process.cwd()
    const mapsDir = path.normalize(`${rootDir}/dist/${type}/maps`)
    if (!fs.existsSync(mapsDir)) {
        fs.mkdirSync(mapsDir, { recursive: true })
    }
    for (let map of json.maps) {
        const { fileName } = map
        if (!fileName.endsWith('.tmx')) continue
        const target = path.join(path.dirname(filepath), fileName)
        const fileContent = fs.readFileSync(target, 'utf-8')
        const hash = crypto.createHash('md5').update(fileContent).digest("hex")
        p.push(new Promise((resolve, reject) => {
            parse(fileContent, filepath, (err, result) => {
                if (err) return reject(err)
                const name = path.parse(target).name
                const urlName = `maps/${hash}.${name}.json`
                fs.writeFileSync(path.normalize(`${rootDir}/dist/${type}/${urlName}`), JSON.stringify(result), 'utf-8')
                map.id = name
                map.fileName = urlName
                map.properties = result.properties
                resolve()
            })
        })) 
    }
    await Promise.all(p)
    const js = `module.exports = ${JSON.stringify(json)}`
    callback(null, js, sourcemap, meta)*/
    this.cacheable()
    const callback = this.async()
    const js = `module.exports = ${text}`
    callback(null, js, sourcemap, meta)
}