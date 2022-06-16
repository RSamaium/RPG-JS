import { xml2js } from 'xml-js'
import { TiledLayer } from '../types/Layer'
import { TiledMap } from '../types/Map'
import { TilesetTile } from '../types/Tile'
import { TiledTileset } from '../types/Tileset'
import { TiledProperty } from '../types/Types'

export class TiledParser {
    private objectgroups: Map<number, any> = new Map()

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

    static flatElements(obj, attr = {}) {
      const { elements } = obj
      if (elements) {
        for (let element of elements) {
          attr = {
            ...attr,
            [element.name]: TiledParser.transform(element),
            ...TiledParser.flatElements(element, attr)
          }
        }
      }
      return attr
    }

    static transform = (obj) => {
      if (!obj) return
      const attr = obj.attributes || obj._attributes
      if (!attr) return obj
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
            'tilecount',
            'rotation',
            'gid'
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
      if (newObj.polygon) {
        newObj.polygon = TiledParser.transform(newObj.polygon)
      }
      if (newObj.polyline) {
        newObj.polyline = TiledParser.transform(newObj.polyline)
      }
      if (newObj.points) {
        newObj.points = newObj.points.split(' ').map(point => {
          const pos = point.split(',')
          return { x: +pos[0], y: +pos[1] }
        })
      }
      if (newObj.point) {
        newObj.point = true
      }
      if (newObj.ellipse) {
        newObj.ellipse = true
      }
      if (newObj.object) {
        newObj.objects = TiledParser.toArray(newObj.object).map((object: any) => {
          return TiledParser.transform(object)
        })
      }
      delete newObj._attributes
      delete newObj.attributes
      delete newObj.object
      delete newObj.objectgroup
      return newObj
    }

    static decode(obj: { encoding: string, data: string }) {
      /*function unpackTileBytes(buf) {
        var expectedCount = map.width * map.height * 4;
        if (buf.length !== expectedCount) {
          error(new Error("Expected " + expectedCount +
                " bytes of tile data; received " + buf.length));
          return;
        }
        tileIndex = 0;
        for (var i = 0; i < expectedCount; i += 4) {
          saveTile(buf.readUInt32LE(i));
        }
      }*/
      const { encoding, data } = obj
      if (encoding == 'base64') {
         return Buffer.from(data.trim(), 'base64')
      }
      else if (encoding == 'csv') {
        return data.trim().split(',').map(x => +x)
      }
      return data
    }

    parseMap(): TiledMap {
        const json: any = xml2js(this.xml, { compact: true })
        const jsonNoCompact: any = xml2js(this.xml)
        //const layer = json.map.layer
        const tileset = json.map.tileset
        const group = json.map.group

        const recursiveObjectGroup = (obj) => {
          const { objectgroup, group } = obj
          if (objectgroup) {
            this.objectgroups.set(+objectgroup._attributes.id, objectgroup)
          }
          if (group) {
            recursiveObjectGroup(group)
          }
        }

        recursiveObjectGroup(json.map)

        const recursiveLayer = (elements, array: any = []) => {
          if (!elements) return array
          for (let element of elements) {
            const { name } = element
            if (!['layer', 'group', 'imagelayer', 'objectgroup'].includes(name)) continue
            const firstElement = element.elements?.[0]
            const data = firstElement?.name == 'data' ? firstElement : undefined
            if (name == 'objectgroup') {
              element.object = this.objectgroups.get(+element.attributes.id)?.object
            }
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