import { TiledLayer } from "../types/Layer";
import { TileGid } from "./Gid";
import { TiledObjectClass } from "./Object";
import { TiledProperties } from "./Properties";
import { Tile } from "./Tile";
import { Tileset } from "./Tileset";

export class Layer extends TiledProperties {
    tiles: (Tile | undefined)[] = []
    objects: TiledObjectClass[]

    constructor(layer: TiledLayer, private tilesets: Tileset[], private parent?: Layer) {
        super(layer)
        Object.assign(this, layer)
        this.propertiesTiles()
        this.mapObjects()
        this.mergePropertiesWithParent()
    }

    createTile(gid: number, tileIndex: number): Tile | undefined{
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
                index: tileIndex
            })
        }
        return new Tile({
            gid,
            index: tileIndex
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
        for (let i=0 ; i < data.length ; i++) {
            const id = data[i]
            this.tiles.push(this.createTile(id, i))
        }
    }

    private mapObjects() {
        if (this.objects) {
            this.objects = this.objects.map(object => new TiledObjectClass(object))
        }
    }

    getTileByIndex(tileIndex: number): Tile | undefined {
        return this.tiles[tileIndex]
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

    tilesForEach(cb: (tile: Tile, index: number) => void) {
        for (let i=0 ; i < this.tiles.length ; i++) {
            cb(this.tiles[i] as Tile, i)
        }
    }
}

export interface Layer extends TiledLayer {
    objects: TiledObjectClass[]
}