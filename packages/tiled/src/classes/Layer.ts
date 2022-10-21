import { TiledLayer } from "../types/Layer";
import { TileGid } from "./Gid";
import { TiledObjectClass } from "./Object";
import { TiledProperties } from "./Properties";
import { Tile } from "./Tile";
import { Tileset } from "./Tileset";

export class Layer extends TiledProperties {
    cacheTiles: boolean = false
    tiles: (Tile | undefined)[] = []
    objects: TiledObjectClass[]

    get size(): number {
        return this.data.length
    }

    constructor(layer: TiledLayer, private tilesets: Tileset[], private parent?: Layer) {
        super(layer)
        Object.assign(this, layer)
        this.mapObjects()
        this.mergePropertiesWithParent()
        // Caching tiles saves CPU but consumes RAM for large maps
        this.cacheTiles = this.getProperty<boolean, boolean>('cache-tiles', false)
        if (this.cacheTiles) this.propertiesTiles()
    }

    createTile(gid: number, tileIndex: number, layerIndex?: number): Tile | undefined {
        if (gid == 0) {
            return
        }
        const realGid = TileGid.getRealGid(gid)
        const tileset = Layer.findTileSet(realGid, this.tilesets)
        if (!tileset) {
            return undefined
        }
        const tile = tileset.getTile(realGid - tileset.firstgid)
        if (tile) {
            return new Tile({
                ...tile.tile,
                gid,
                index: tileIndex,
                layerIndex
            })
        }
        return new Tile({
            gid,
            index: tileIndex,
            layerIndex
        })
    }

    private mergePropertiesWithParent() {
        const parent = this.getLayerParent()
        if (!this.properties) this.properties = {}
        if (!parent) return
        for (let key in parent.properties) {
            const val = parent.properties[key]
            const valChild = this.properties[key]
            if (valChild === undefined) {
                this.properties[key] = val
            }
            else {
                if (key == 'z') {
                    this.properties[key] += val
                }
                else {
                    continue
                }
            }
        }
        this.opacity = Math.round((parent.opacity ?? 1) * (this.opacity ?? 1) * 100) / 100
        this.offsetx = (parent.offsetx ?? 0) + (this.offsetx ?? 0)
        this.offsety = (parent.offsety ?? 0) + (this.offsety ?? 0)
        this.locked = parent.locked ?? false
    }

    private propertiesTiles() {
        if (!this.data) return
        const data = this.data as number[]
        for (let i = 0; i < data.length; i++) {
            const id = data[i]
            this.tiles.push(this.createTile(id, i))
        }
    }

    private mapObjects() {
        if (this.objects) {
            this.objects = this.objects.map(object => {
                const obj = new TiledObjectClass(object)
                obj.layerName = this.name
                return obj
            })
        }
    }

    getTileByIndex(tileIndex: number): Tile | undefined {
        if (this.cacheTiles) {
            return this.tiles[tileIndex]
        }
        return this.createTile(this.data[tileIndex] as number, tileIndex)
    }

    static findTileSet(gid: number, tileSets: Tileset[]): Tileset | undefined {
        let tileset: Tileset | undefined
        for (let i = tileSets.length - 1; i >= 0; i--) {
            tileset = tileSets[i]
            if (tileset.firstgid && tileset.firstgid <= gid) {
                break;
            }
        }
        return tileset;
    }

    getLayerParent(): Layer | undefined {
        return this.parent
    }

    tilesForEach(cb: (tile: Tile | undefined, index: number) => void) {
        for (let i = 0; i < this.data.length; i++) {
            if (this.cacheTiles) {
                cb(this.tiles[i], i)
                continue
            }
            cb(this.createTile(this.data[i] as number, i) as Tile, i)
        }
    }

    setData(tileIndex: number, gid: number): void {
        (this.data as number[])[tileIndex] = gid
    }
}

export interface Layer extends TiledLayer {
    objects: TiledObjectClass[]
}