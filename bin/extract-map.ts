import fs from 'fs'
import path from 'path'
import tmx from '../src/server/parser/tmx'

const dirpath = process.argv[2]
const RPG_Server = require(path.join(dirpath, 'src/server/rpg')).default
const { maps } = RPG_Server['_options']
const dist = path.join(dirpath, 'dist/standalone/maps')

if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist)
}

const extract = function(map) {
    return new Promise((resolve, reject) => {
        tmx.parseFile(map.file, (err, content) => {
            if (err) return reject(err)
            for (let layer of content.layers) {
                delete layer.map
            }
            const json = JSON.stringify(content)
            const filename = path.basename(map.file, '.tmx')
            fs.writeFileSync(path.join(dist, filename + '.json'), json, 'utf-8')
            console.log('- ' + filename + '.tmx and tilesets are extracted')
            resolve()
        })
    })
}

Promise
    .all(maps.map(extract))
    .then(() => {
        console.log('-- Extract Maps finished --')
    })