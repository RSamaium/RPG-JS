import { TiledParser } from "./parser"
import axios from 'axios'
import fs from 'fs'
import { TiledMap } from "../types/Map"
import { TiledTileset } from "../types/Tileset"

export class TiledParserFile {
    constructor(private file: string, private basePath: string) { }

    static isBrowser() {
        return typeof window !== 'undefined'
    }

    private _parseFile<T>(file: string, type: string, cb: Function) {
        const isXml = content => content.startsWith('<?xml')

        const loadContent = (content) => {
            if (!content) {
                return cb(null)
            }
            if (isXml(content)) {
                const parser = new TiledParser(content)
                if (type == 'map') {
                    const json = parser.parseMap() as any 
                    return cb(json)
                }
                else if (type == 'tileset') {
                    const json = parser.parseTileset() as any
                    return cb(json)
                }
            }
    
            return cb(JSON.parse(content))
        }

        if (file['version']) {
            return cb(file)
        }

        const isHttp = file.startsWith('http')
        if (isXml(file)) {
            loadContent(file)
        }
        else if (isHttp || (TiledParserFile.isBrowser() && process.env.NODE_ENV != 'test')) {
            const url = isHttp ? file : this.basePath + '/' + file
            axios.get(url).then(res => res.data).then(loadContent)
        }
        else {
            const filepath = this.basePath + '/' + file
            fs.readFile(filepath, 'utf-8', (err, data) => {
                if (err) return cb(null, err)
                loadContent(data)
            })
            return
        }

        
    }

    parseFile(cb: Function) {   
        this._parseFile<TiledMap>(this.file, 'map', (map, err) => {
            let hasError = false
            if (err) return cb(null, err)
            if (map.tilesets) {
                const parseTileset: TiledTileset[] = []
                const finish = () => {
                    loadAll++
                    if (loadAll == map.tilesets.length && !hasError) {
                        map.tilesets = parseTileset
                        cb(map)
                    }
                }
                let loadAll = 0
                for (let i=0; i <  map.tilesets.length ; i++) {
                    const tileset = map.tilesets[i]
                    if (!tileset.source) {
                        parseTileset[i] = tileset
                        finish()
                        continue
                    }
                    this._parseFile<TiledTileset>(tileset.source, 'tileset', (result, err) => {
                        if (err) {
                            hasError = true
                            return cb(null, err)
                        }
                        parseTileset[i] = {
                            ...result,
                            firstgid: tileset.firstgid
                        }
                        finish()
                    })
                }
                
            }
        })
    }

    parseFilePromise(): Promise<TiledMap> {
        return new Promise((resolve, reject) => {
            this.parseFile((ret, err) => {
                if (ret) resolve(ret)
                else reject(err)
            })
        })
    }
}