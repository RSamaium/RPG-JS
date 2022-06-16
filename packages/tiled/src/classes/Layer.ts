import { TiledLayer } from "../types/Layer";
import { TiledProperties } from "./Properties";
import { Tile } from "./Tile";
import { Tileset } from "./Tileset";

interface TileInfo {
    id: number
}

export class Layer extends TiledProperties {
    tiles: Tile[] = []

    constructor(private layer: TiledLayer, private tilesets: Tileset[]) {
        super(layer)
        Object.assign(this, layer)
        this.propertiesTiles()
    }

    private propertiesTiles() {
        if (!this.data) return
        const data = this.data as number[]
        for (let id of data) {
            const tileset = Layer.findTileSet(id, this.tilesets)
            if (!tileset) continue
            const tile = tileset.getTile(id - tileset.firstgid)
            if (tile) this.tiles.push(tile)
        }
    }

    getTileByIndex(tileIndex: number): Tile {
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

export interface Layer extends TiledLayer {}