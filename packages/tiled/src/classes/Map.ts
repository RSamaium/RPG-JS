import { TiledLayer, TiledLayerType } from "../types/Layer";
import { TiledMap } from "../types/Map";
import { TiledTileset } from "../types/Tileset";
import { Layer } from "./Layer";
import { TiledObjectClass } from "./Object";
import { TiledProperties } from "./Properties";
import { Tile } from "./Tile";
import { Tileset } from "./Tileset";

export interface TileInfo {
    tiles: Tile[]
    hasCollision: boolean | undefined
    isClimbable?: boolean | undefined
    isOverlay: boolean | undefined
    objectGroups: TiledObjectClass[],
    tileIndex: number
}

export interface GetTileOptions {
    populateTiles?: boolean
}

// Allows you to cache tilesets. Avoid rebuilding for other maps
export let bufferTilesets = {}

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
    private tilesIndex: {
        [zIndex: number]: Uint16Array
    } = {}

    /**
     * Allows to define the size of ArrayBuffer to keep in memory the tiles of the map
     */
    private allocateMemory: number = 0

    /**
     * If set to true, the memory allocation will take only one tile (the tile of the last layer)
     */
    private lowMemory: boolean = false

    constructor(map?: TiledMap) {
        super(map ?? {})
        if (map) this.load(map)
    }

    load(map: TiledMap) {
        Object.assign(this, map)
        if (this.hasProperty('low-memory')) {
            this.lowMemory = this.getProperty<boolean, boolean>('low-memory', false)
        }
        this.tmpLayers = []
        this.mapTilesets()
        this.mapLayers(this.layers)
        this.layers = [...this.tmpLayers]
        Reflect.deleteProperty(this, 'tmpLayers')
        this.setTilesIndex()
        this.data = map  
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

    getTilePosition(index: number): { x: number, y: number } {
        return {
            y: Math.floor(index / this.width) * this.tileheight,
            x: index % (this.width) * this.tilewidth
        }
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
    getTileByPosition(x: number, y: number, z: [number, number] = [0, 0], options: GetTileOptions = {}): TileInfo {
        const tileIndex = this.getTileIndex(x, y, [z[0]])
        return this.getTileByIndex(tileIndex, z, options)
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

    getTileByIndex(
        tileIndex: number, 
        zPlayer: [number, number] = [0, 0], 
        options: GetTileOptions = {
            populateTiles: true
        }
    ): TileInfo {
        const zA = Math.floor(zPlayer[0] / this.zTileHeight)
        const zB = Math.floor(zPlayer[1] / this.zTileHeight)
        const level = this.tilesIndex[zA]
        const obj: TileInfo = {
            tiles: [],
            hasCollision: true,
            isOverlay: false,
            objectGroups: [],
            tileIndex
        }
        if (!level) {
            return obj
        }
        const [layer] = this.layers
        const getTileByPointer = (pointer = 0) => {
            const pos = tileIndex * this.realAllocateMemory + pointer
            const gid = level[pos]
            if (gid === 0) {
                return obj
            }
            const tile = layer.createTile(gid, tileIndex, level[pos+1])
            if (tile) obj.tiles.push(tile)
        }
        if (options.populateTiles) {
            for (let i=0 ; i < this.realAllocateMemory ; i += 2) {
                getTileByPointer(i)
            }
        }
        else {
            getTileByPointer()
        }
        const [tile] = obj.tiles
        if (tile) {
            obj.hasCollision = tile.getProperty<boolean, boolean>('collision', false)
            obj.objectGroups = tile.objects as TiledObjectClass[] ?? []
        }
        return obj
    }

    getAllObjects(): TiledObjectClass[] {
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
    } | never {
        if (this.lowMemory) {
            throw 'Impossible to change a tile with the lowMemory option'
        }
        const tileIndex = this.getTileIndex(x, y)
        let fnFilter
        let tilesEdited = {}
        if (typeof layerFilter == 'string') {
            fnFilter = (layer) => layer.name == layerFilter
        }
        else {
            fnFilter = layerFilter
        }
        for (let i=0 ; i < this.layers.length ; i++) {
            const layer = this.layers[i]
            if (!fnFilter(layer)) continue
            let tile: Tile | undefined
            const oldTile = this.getTileByIndex(tileIndex)
            if (tileInfo.gid) {
                tile = layer.createTile(tileInfo.gid, tileIndex)
            }
            if (!tile) continue
            for (let key in tileInfo) {
                if (key == 'gid') continue
                tile[key] = tileInfo[key]
            }
            tilesEdited[layer.name] = {
                gid: tile.gid,
                properties: tile.properties
            }
            this.setTileIndex(layer, oldTile.tiles[0], tile, tileIndex, i)
            layer.setData(tileIndex, tile.gid)
        }
        return {
            x,
            y,
            tiles: tilesEdited
        }
    }

    removeCacheTileset(name: string) {
        delete bufferTilesets[name]
    }

    clearCacheTilesets() {
        bufferTilesets = {}
    }

    private mapTilesets() {
        this.tilesets = this.tilesets.map(tileset => {
            if (bufferTilesets[tileset.name]) {
                const instance = bufferTilesets[tileset.name]
                instance.firstgid = tileset.firstgid
                return instance
            }
            const _tileset = new Tileset(tileset)
            bufferTilesets[_tileset.name] = _tileset
            return _tileset
        })
    }

    private mapLayers(layers: TiledLayer[] = [], parent?: Layer) {
        for (let layer of layers) {
            const layerInstance = new Layer(layer, this.tilesets, parent)
            this.tmpLayers.push(layerInstance)
            if (layer.layers) {
                this.mapLayers(layer.layers, layerInstance)
            }
        }
        if (this.lowMemory) this.allocateMemory = 1
        if (!this.allocateMemory) this.allocateMemory = this.layers.length
    }

    private setTileIndex(layer: Layer, oldTile: Tile, newTile: Tile, tileIndex: number, layerIndex: number) {
        const startPos = tileIndex * this.realAllocateMemory
        let pointer = startPos + this.realAllocateMemory - 2
        const zLayer = layer.getProperty<number, number>('z', 0)
        const zTile = oldTile.getProperty<number, number>('z', 0)
        let z = zLayer + zTile
        while (pointer >= startPos) {
            const zlayer = this.tilesIndex[z]
            if (zlayer[pointer] === oldTile.gid && zlayer[pointer+1] === layerIndex) {
                this.tilesIndex[z][pointer] = newTile.gid
            }
            pointer -= 2
        }
    }

    /**
     * We multiply by 2 because 2 entries are stored for a tile: its GID and the Layer Index
     * 
     * Example If I have 3 layers, The array will have the following form 
     * 
     * [
     *  GID of Layer 3, 
     *  Layer Index of Layer 3, 
     *  GID of Layer 2, 
     *  Layer Index of Layer 2, 
     *  GID of Layer 1, 
     *  Layer Index of Layer 1,
     * ... others tiles
     * ]
     * 
     * The size in memory of the map is therefore:
     * 
     * `(map width * map height * number of layers * 4) bytes`
     * 
     * > We multiply by 4, because an element takes 2 bytes and has 2 elements for a tile is 4 bytes in all
     * 
     * Example (a 100x100 map with 5 layers)
     * 
     * `100 * 100 * 5 * 4 = 200000 bytes = ~195 Kb`
     * 
     * If we define on lowMemory then the calculation is the following
     * 
     * `(map width * map height * 4) bytes`
     * 
     * Example
     * 
     * `100 * 100 * 4 = 40000 bytes = ~39 Kb`
     */
    private get realAllocateMemory() {
        return this.allocateMemory * 2
    }

    /**
     * We keep each tile in memory classified by z value. The values are ordered from the end to the beginning so that the first element of the array (when retrieved with getTileByIndex() is the tile on the highest layer. This way, the tile search is very fast for collisions 
     * 
     */
    private addTileIndex(layer: Layer, tile: Tile | undefined, tileIndex: number, layerIndex: number) {
        if ((!tile) || (tile && tile.gid == 0)) {
            return
        }
        const zLayer = layer.getProperty<number, number>('z', 0)
        const zTile = tile.getProperty<number, number>('z', 0)
        let z = zLayer + zTile
        if (!this.tilesIndex[z]) {
            const buffer = new ArrayBuffer(layer.size * this.realAllocateMemory * 2)
            this.tilesIndex[z] = new Uint16Array(buffer)
        }
        const startPos = tileIndex * this.realAllocateMemory
        let pointer = startPos + this.realAllocateMemory - 2

        while (this.tilesIndex[z][pointer] !== 0 && pointer > startPos) {
            pointer -= 2
        }

        this.tilesIndex[z][pointer] = tile.gid
        this.tilesIndex[z][pointer+1] = layerIndex
        this.tilesIndex[z][startPos] = tile.gid
        this.tilesIndex[z][startPos+1] = layerIndex
    }

    private setTilesIndex() {
        for (let i=0 ; i < this.layers.length ; i++) {
            const layer = this.layers[i]
            if (layer.type != TiledLayerType.Tile) {
                continue
            }
            layer.tilesForEach((tile, index) => {
                this.addTileIndex(layer, tile, index, i)
            })
        }
    }
}

export interface MapClass extends TiledMap { }