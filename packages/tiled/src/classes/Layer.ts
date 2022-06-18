import { TiledLayer } from "../types/Layer";
import { TiledObjectClass } from "./Object";
import { TiledProperties } from "./Properties";
import { Tile } from "./Tile";
import { Tileset } from "./Tileset";

export class Layer extends TiledProperties {
    tiles: (Tile | undefined)[] = []
    objects: TiledObjectClass[]

    constructor(layer: TiledLayer, private tilesets: Tileset[]) {
        super(layer)
        Object.assign(this, layer)
        this.propertiesTiles()
        this.mapObjects()
    }

    createTile(gid: number): Tile | undefined{
        const tileset = Layer.findTileSet(gid, this.tilesets)
        if (!tileset) {
            return undefined
        }
        const tile = tileset.getTile(gid - tileset.firstgid)
        if (tile) {
            return new Tile({
                ...tile.tile,
                gid
            })
        }
        return new Tile({
            gid
        })
    }

    private propertiesTiles() {
        if (!this.data) return
        const data = this.data as number[]
        for (let id of data) {
            this.tiles.push(this.createTile(id))
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
}

export interface Layer extends TiledLayer {
    objects: TiledObjectClass[]
}