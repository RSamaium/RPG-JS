import { TiledLayer, TiledLayerType } from "../types/Layer";
import { TiledMap } from "../types/Map";
import { Layer } from "./Layer";
import { TiledObjectClass } from "./Object";
import { TiledProperties } from "./Properties";
import { Tile } from "./Tile";
import { Tileset } from "./Tileset";
var process = require('process')

function intersection([start1, end1]: [number, number], [start2, end2]: [number, number]): boolean {
    return (start1 >= start2 && start1 <= end2) || (start2 >= start1 && start2 < end1)
}

export interface TileInfo {
    tiles: Tile[]
    hasCollision: boolean | undefined
    isClimbable?: boolean | undefined
    isOverlay: boolean | undefined
    objectGroups: TiledObjectClass[],
    tileIndex: number
}

export class MapClass extends TiledProperties {
    /** 
     * @title Data of map
     * @prop {object} [data]
     * @readonly
     * @memberof Map
     * @memberof RpgSceneMap
     * */
     data: TiledMap

    tilesets: Tileset[] = []
    layers: Layer[] = []
    private tmpLayers: Layer[] = [] 
    private tilesIndex: Map<number, Map<number, TileInfo>> = new Map()

    constructor(map?: TiledMap) {
        super(map ?? {})
        if (map) this.load(map)
    }

    load(map: TiledMap) {
        let a, b
        if (typeof process != 'undefined') a = process.memoryUsage?.()
        Object.assign(this, map)
        this.mapTilesets()
        this.mapLayers(this.layers)
        this.layers = [...this.tmpLayers]
        Reflect.deleteProperty(this, 'tmpLayers')
        this.setTilesIndex()
        this.data = map
        if (typeof process != 'undefined') b = process.memoryUsage?.()
        if (a) console.log((b.heapUsed - a.heapUsed) / 1024 / 1024)
    }

    /** 
     * @title Width of the map in pixels
     * @prop {number} [widthPx]
     * @readonly
     * @memberof Map
     * @memberof RpgSceneMap
     * */

    get widthPx(): number {
        return this.width * this.tilewidth
    }

     /** 
     * @title Height of the map in pixels
     * @prop {number} [heightPx]
     * @readonly
     * @memberof Map
     * @memberof RpgSceneMap
     * */
    get heightPx(): number {
        return this.height * this.tileheight
    }

    /** 
     * @title The depth of the map in pixels (this is the height of a tile ;))
     * @prop {number} map.zTileHeight
     * @readonly
     * @memberof Map
     * @memberof RpgSceneMap
     * */
     get zTileHeight(): number {
        return this.tileheight
    }

    /**
     * Find a layer by name. Returns `undefined` is the layer is not found

     * @title Get Layer by name
     * @method map.getLayerByName(name)
     * @param {string} name layer name
     * @returns {LayerInfo | undefined}
     * @example
     *  ```ts
     *  const tiles = map.getLayerByName(0, 0)
     *  ```
     * @memberof Map
     * @memberof RpgSceneMap
     */
    getLayerByName(name: string): TiledLayer | undefined {
        return this.layers.find(layer => layer.name == name)
    }

     /**
     * Get the tile index on the tileset
     * 
     * @title Get index of tile
     * @method map.getTileIndex(x,y)
     * @param {number} x Position X
     * @param {number} x Position Y
     * @returns {number}
     * @memberof Map
     * @memberof RpgSceneMap
     */
    getTileIndex(x: number, y: number, [z] = [0]): number {
        return this.width * Math.floor((y - z) / this.tileheight) + Math.floor(x / this.tilewidth)
    }

    /**
     * Find the point of origin (top left) of a tile. Of course, its position depends on the size of the tile

     * @title Get origin position of tile
     * @method map.getTileOriginPosition(x,y)
     * @param {number} x Position X
     * @param {number} x Position Y
     * @returns { {x: number, y: number }}
     * @example
     *  ```ts
     *  // If the size of a tile is 32x32px
     *  const position = map.getTileOriginPosition(35, 12)
     *  console.log(position) // { x: 32, y: 0 }
     *  ```
     * @memberof Map
     * @memberof RpgSceneMap
     */
    
    getTileOriginPosition(x: number, y: number): {
        x: number
        y: number
    } {
        return { 
            x: Math.floor(x / this.tilewidth) * this.tilewidth,
            y: Math.floor(y / this.tileheight) * this.tileheight
        }
    }

     /**
     * Recover tiles according to a position

     * @title Get tile by position
     * @method map.getTileByPosition(x,y)
     * @param {number} x Position X
     * @param {number} x Position Y
     * @returns {TileInfo}
     * @example
     *  ```ts
     *  const tiles = map.getTileByPosition(0, 0)
     *  ```
     * @memberof Map
     * @memberof RpgSceneMap
     */
      getTileByPosition(x: number, y: number, z: [number, number] = [0, 0]): TileInfo {
        const tileIndex = this.getTileIndex(x, y, [z[0]])
        return this.getTileByIndex(tileIndex, z)
    }


  
    /**
     * Retrieves tiles according to its index

     * @title Get tile by index
     * @method map.getTileByIndex(tileIndex)
     * @param {number} tileIndex tile index
     * @returns {TileInfo}
     * @example
     *  ```ts
     *  const index = map.getTileIndex(0, 0)
     *  const tiles = map.getTileByIndex(index)
     *  ```
     * @memberof Map
     * @memberof RpgSceneMap
     */

    getTileByIndex(tileIndex: number, zPlayer: [number, number] = [0, 0]): TileInfo {
        const zA = Math.floor(zPlayer[0] / this.zTileHeight)
        const zB = Math.floor(zPlayer[1] / this.zTileHeight)
        const indexInfo = this.tilesIndex.get(tileIndex)
        const defaultObject = {
            tiles: [],
            hasCollision: true,
            isOverlay: false,
            objectGroups: [],
            tileIndex
        }
        if (!indexInfo) {
            return defaultObject
        }
        const level = indexInfo.get(zA)
        if (!level) {
            return defaultObject
        }
        return level
    }

    getAllObjects(): TiledObjectClass[]  {
        return this.layers.reduce((prev: TiledObjectClass[], current: Layer) => {
            if (!current.objects) return prev
            return prev.concat(...current.objects)
        }, [])
    }

    getData() {
        return {
            ...this.data,
            layers: this.layers
        }
    }

    setTile(x: number, y: number, layerFilter: string | ((layer: any) => boolean), tileInfo: any): {
        x: number,
        y: number,
        tiles: {
            [tileIndex: number]: Tile
        }
    } {
        const tileIndex = this.getTileIndex(x, y)
        let fnFilter
        let tilesEdited = {}
        if (typeof layerFilter == 'string') {
            fnFilter = (layer) => layer.name == layerFilter
        }
        else {
            fnFilter = layerFilter
        }
        for (let layer of this.layers) {
            if (!fnFilter(layer)) continue
            const data = layer.tiles
            let tile
            if (tileInfo.gid) {
                tile = layer.createTile(tileInfo.gid, tileIndex)
            }
            for (let key in tileInfo) {
                if (key == 'gid') continue
                tile[key] = tileInfo[key]
            }
            tilesEdited[layer.name] = tile
            data[tileIndex] = tilesEdited[layer.name]
            this.setTileIndex(layer, tile, tileIndex)
        }
        return {
            x,
            y,
            tiles: tilesEdited
        }
    } 

    private mapTilesets() {
        this.tilesets = this.tilesets.map(tileset => new Tileset(tileset))
    }

    private mapLayers(layers: TiledLayer[] = [], parent?: Layer) {
        for (let layer of layers) {
            const layerInstance = new Layer(layer, this.tilesets, parent)
            this.tmpLayers.push(layerInstance)
            if (layer.layers) {
                this.mapLayers(layer.layers, layerInstance)
            }
        }
    }

    private setTileIndex(layer: Layer, tile: Tile, index: number) {
        if ((!tile) || (tile && tile.gid == 0)) {
            return
        }
        const zLayer = layer.getProperty<number, number>('z', 0)
        const zTile = tile.getProperty<number, number>('z', 0)
        let z = zLayer + zTile
        if (!this.tilesIndex.has(index)) this.tilesIndex.set(index, new Map())
        const zMap = this.tilesIndex.get(index)
        if (!zMap?.has(z)) zMap?.set(z, {
            tiles: [],
            hasCollision: true,
            isOverlay: false,
            objectGroups: [],
            tileIndex: index
        })
        const obj = zMap?.get(z)
        if (obj) {
            const tileExist = obj.tiles.findIndex(tile => tile.index == index)
            if (tileExist == -1) {
                obj.tiles.push(tile) 
            }
            else {
                obj.tiles[tileExist] = tile
            }
            if (tileExist == -1 || tileExist == obj.tiles.length-1) {
                obj.hasCollision = tile.getProperty<boolean, boolean>('collision', false)
                obj.objectGroups = tile.objects as TiledObjectClass[] ?? []
            }
        }
    }
    
    private setTilesIndex() {
        for (let layer of this.layers) {
            if (layer.type != TiledLayerType.Tile) {
                continue
            }
            layer.tilesForEach((tile, index) => {
                this.setTileIndex(layer, tile, index)
            })
        }
    }
}

export interface MapClass extends TiledMap {}