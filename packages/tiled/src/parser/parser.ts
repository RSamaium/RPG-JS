import { xml2js } from 'xml-js'
import { TiledLayer } from '../types/Layer'
import { TiledMap } from '../types/Map'
import { TilesetTile } from '../types/Tile'
import { TiledTileset } from '../types/Tileset'
import { TiledProperty } from '../types/Types'

export class TiledParser {
    constructor(private xml: string) {}

    static propToNumber = (obj, props: string[]) => {
      for (let key of props) {
        if (obj[key] !== undefined) {
          obj[key] = +obj[key]
        }        
      }
      return obj
    }

    static propToBool = (obj, props: string[]) => {
      for (let key of props) {
        if (obj[key] !== undefined) {
          obj[key] = obj[key] == 'true' || obj[key] == '1'
        }        
      }
      return obj
    }

    static toArray<T>(prop): T[] {
      if (!prop) return []
      if (!Array.isArray(prop)) return [prop]
      return prop
    }

    static transform = (obj) => {
      if (!obj) return
      const attr = obj.attributes || obj._attributes
      const newObj = {
          ...obj,
          ...attr,
          ...TiledParser.propToNumber(attr, [
            'version',
            'width', 
            'height', 
            'tilewidth', 
            'tileheight', 
            'nextlayerid',
            'nextobjectid',
            'hexsidelength',
            'opacity',
            'x',
            'y',
            'offsetx',
            'offsety',
            'startx',
            'starty',
            'id',
            'firstgid',
            'imageheight',
            'imagewidth',
            'margin',
            'columns',
            'rows',
            'tilecount'
          ]),
          ...TiledParser.propToBool(attr, [
            'visible',
            'infinite'
          ])
      }
      if (newObj.properties) {
        newObj.properties = TiledParser.toArray(newObj.properties).map((prop: any) => {
          return prop.property._attributes
        })
      }
      delete newObj._attributes
      delete newObj.attributes
      return newObj
    }

    static decode(obj: { encoding: string, data: string }) {
      const { encoding, data } = obj
      if (encoding == 'base64') {
         return Buffer.from(data.trim(), 'base64')
      }
      return data
    }

    parseMap(): TiledMap {
        const json: any = xml2js(this.xml, { compact: true })
        const jsonNoCompact: any = xml2js(this.xml)
        //const layer = json.map.layer
        const tileset = json.map.tileset
        const group = json.map.group

        const recursiveLayer = (elements, array: any = []) => {
          for (let element of elements) {
            const { name } = element
            if (!['layer', 'group', 'imagelayer', 'objectgroup'].includes(name)) continue
            const firstElement = element.elements[0]
            const data = firstElement.name == 'data' ? firstElement : undefined
            const obj = {
              ...(TiledParser.transform(data) ?? {}),
              ...TiledParser.transform(element),
              layers: recursiveLayer(element.elements),
              data: data ? data.elements[0].text : undefined,
              type: name == 'layer' ? 'tilelayer' : name
            }
            delete obj.type
            delete obj.elements
            if (obj.data) obj.data = TiledParser.decode(obj)
            array.push(obj)
          }
          return array
        }

        const layers = recursiveLayer(jsonNoCompact.elements[0].elements)

        const tilesets = TiledParser.toArray<TiledTileset>(tileset).map(tileset => {
          const obj = TiledParser.transform(tileset)
          return obj
        })

        const ret = {
          ...TiledParser.transform(json.map),
          layers,
          tilesets
        } 

        delete ret.layer
        delete ret.tileset
        delete ret.group

        return ret
    }

    parseTileset(): TiledTileset {
      const json: any = xml2js(this.xml, { compact: true })
      const { tileset } = json

      const ret = {
        ...TiledParser.transform(tileset),
        image: TiledParser.transform(tileset.image),
        tiles: TiledParser.toArray<TilesetTile>(tileset.tile).map(tile => {
          const obj = TiledParser.transform(tile)
          return obj
        })
      } 

      delete ret.tile

      return ret
    }
}