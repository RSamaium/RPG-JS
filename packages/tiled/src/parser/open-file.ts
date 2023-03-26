import { TiledParser } from "./parser"
import axios from 'axios'
import fs from 'fs'
import { TiledMap } from "../types/Map"
import { TiledTileset } from "../types/Tileset"
import path from "path"

type ParseOptions = { getOnlyBasename?: boolean }

export class TiledParserFile {
    constructor(private file: string, private basePath: string) { }

    static isBrowser() {
        return typeof window !== 'undefined'
    }

    static typeOfFile(file: string): {
        isXml: boolean
        isObject: boolean
        isHttp: boolean
        isPath: boolean
    } {
        const isString = typeof file == 'string'
        const info = {
            isXml: isString && file.startsWith('<?xml'),
            isObject: !!file['version'],
            isHttp: isString && file.startsWith('http')
        }
        return  {
            ...info,
            isPath: !info.isXml && !info.isObject && !info.isHttp
        }
    }

    private _parseFile<T>(file: string, type: string, cb: Function) {
        const isXml = content => TiledParserFile.typeOfFile(content).isXml

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

        if (TiledParserFile.typeOfFile(file).isObject) {
            return cb(file)
        }

        const { isHttp } = TiledParserFile.typeOfFile(file)
        if (isXml(file)) {
            loadContent(file)
        }
        else if (isHttp || (TiledParserFile.isBrowser() && process.env.NODE_ENV != 'test')) {
            const url = isHttp ? file : this.basePath + '/' + file
            axios.get(url).then(res => res.data).then(loadContent)
        }
        else {
            let filepath = file
            if (file.startsWith('/')) {
                filepath = (this.basePath ? this.basePath + '/' : '') + file
            }
            fs.readFile(path.normalize(filepath), 'utf-8', (err, data) => {
                if (err) return cb(null, err)
                loadContent(data)
            })
            return
        }   
    }

    parseFile(cb: Function, options: ParseOptions = {}) {
        const { getOnlyBasename } = options
        const basename = path => path.substring(path.lastIndexOf('/') + 1)
        if (getOnlyBasename) {
            if (TiledParserFile.typeOfFile(this.file).isPath) {
                this.file = basename(this.file)
            }
        }
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
                    if (getOnlyBasename) {
                        if (TiledParserFile.typeOfFile(tileset.source).isPath) {
                            tileset.source = basename(tileset.source)
                        }
                    }
                    const basePath = this.basePath + '/' + this.file.substring(0, this.file.lastIndexOf('/'))
                    this._parseFile<TiledTileset>(path.normalize(path.join(basePath, tileset.source)), 'tileset', (result, err) => {
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

    parseFilePromise(options: ParseOptions = {}): Promise<TiledMap> {
        return new Promise((resolve, reject) => {
            this.parseFile((ret, err) => {
                if (ret) resolve(ret)
                else reject(err)
            }, options)
        })
    }
}