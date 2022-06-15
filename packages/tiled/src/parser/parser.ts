import { xml2js } from 'xml-js'
import { TiledLayer } from '../types/Layer'
import { TiledMap } from '../types/Map'
import { TiledTileset } from '../types/Tileset'

export class TiledParser {
    constructor(private xml: string) {}

    parse(): TiledMap {
        const json: any = xml2js(this.xml, { compact: true })
        const jsonNoCompact: any = xml2js(this.xml)

        //const layer = json.map.layer
        const tileset = json.map.tileset
        const group = json.map.group

        const propToNumber = (obj, props: string[]) => {
          for (let key of props) {
            if (obj[key] !== undefined) {
              obj[key] = +obj[key]
            }        
          }
          return obj
        }

        function toArray<T>(prop): T[] {
          if (!prop) return []
          if (!Array.isArray(prop)) return [prop]
          return prop
        }

        const transform = (obj) => {
          if (!obj) return
          const attr = obj.attributes || obj._attributes
          const newObj = {
              ...obj,
              ...attr,
              ...propToNumber(attr, [
                'width', 
                'height', 
                'tilewidth', 
                'tileheight', 
                'infinite',
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
                'firstgid'
              ]) 
          }
          delete newObj._attributes
          delete newObj.attributes
          return newObj
        }

        const recursiveLayer = (elements, array: any = []) => {
          for (let element of elements) {
            const { name } = element
            if (name != 'layer' && name != 'group') continue
            const firstElement = element.elements[0]
            const data = firstElement.name == 'data' ? firstElement : undefined
            const obj = {
              ...(transform(data) ?? {}),
              ...transform(element),
              layers: recursiveLayer(element.elements),
              data: data ? data.elements[0].text : undefined,
              isGroup: name == 'group'
            }
            delete obj.type
            delete obj.elements
            array.push(obj)
          }
          return array
        }

        const layers = recursiveLayer(jsonNoCompact.elements[0].elements)


        const tilesets = toArray<TiledTileset>(tileset).map(tileset => {
          const obj = transform(tileset)
          return obj
        })

        const ret = {
          ...transform(json.map),
          layers,
          tilesets
        } 

        delete ret.layer
        delete ret.tileset
        delete ret.group

        return ret
    }
}