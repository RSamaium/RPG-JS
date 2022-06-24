import { TiledLayer, TiledLayerType } from "../types/Layer";
import { TiledMap } from "../types/Map";
import { Layer } from "./Layer";
import { TiledObjectClass } from "./Object";
import { TiledProperties } from "./Properties";
import { Tile } from "./Tile";
import { Tileset } from "./Tileset";

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
    tilesets: Tileset[] = []
    layers: Layer[] = []
    private tmpLayers: Layer[] = [] 
    private tilesIndex: Map<number, Map<number, TileInfo>> = new Map()

    constructor(map?: TiledMap) {
        super(map ?? {})
        if (map) this.load(map)
    }

    load(map: TiledMap) {
        Object.assign(this, map)
        this.mapTilesets()
        this.mapLayers(this.layers)
        this.layers = this.tmpLayers
        Reflect.deleteProperty(this, 'tmpLayers')
        this.setTilesIndex()
    }

    get widthPx(): number {
        return this.width * this.tilewidth
    }

    get heightPx(): number {
        return this.height * this.tileheight
    }

    getLayerByName(name: string): TiledLayer | undefined {
        return this.layers.find(layer => layer.name == name)
    }

    getTileIndex(x: number, y: number, [z] = [0]): number {
        return this.width * Math.floor((y - z) / this.tileheight) + Math.floor(x / this.tilewidth)
    }

    getTileOriginPosition(x: number, y: number): {
        x: number
        y: number
    } {
        return { 
            x: Math.floor(x / this.tilewidth) * this.tilewidth,
            y: Math.floor(y / this.tileheight) * this.tileheight
        }
    }

   /* getTileByIndex(tileIndex: number, zPlayer: [number, number] = [0, 0]): TileInfo {
        const tiles: Tile[] = []
        for (let layer of this.layers) {
            if (layer.type != TiledLayerType.Tile) {
                continue
            }
            const _tile: Tile | undefined = layer.getTileByIndex(tileIndex)
            if ((!_tile) || (_tile && _tile.gid == 0)) {
                continue
            }
            const zLayer = layer.getProperty<number, number>('z', 0)
            const zTile = _tile.getProperty<number, number>('z', 0)
            let z = zLayer + zTile
            let zIntersection
            if (z !== undefined) {
                const realZ = z * this.tileheight
                zIntersection = intersection(zPlayer, [realZ, realZ + this.tileheight])
            }
            if (zIntersection !== undefined) {
                if (zIntersection) tiles.push(_tile)
            }
            else {
                tiles.push(_tile)
            }
        }
        const getLastTile = tiles[tiles.length-1]
        if (!getLastTile) {
            return {
                tiles,
                hasCollision: true,
                isOverlay: false,
                objectGroups: [],
                tileIndex
            }
        }
        const hasCollision = getLastTile.getProperty<boolean>('collision')
        const isOverlay = getLastTile.getProperty<boolean>('overlay')
        const isClimbable = getLastTile.getProperty<boolean>('climb')
        const objectGroups = getLastTile.objects as TiledObjectClass[] ?? []
        return {
            tiles,
            hasCollision,
            isOverlay,
            objectGroups,
            isClimbable,
            tileIndex
        }
    }*/

    getTileByIndex(tileIndex: number, zPlayer: [number, number] = [0, 0]): TileInfo {
        const zA = Math.floor(zPlayer[0] / this.tileheight)
        const zB = Math.floor(zPlayer[1] / this.tileheight)
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