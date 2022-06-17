import { TilesetTile } from "../types/Tile";
import { TiledProperties } from "./Properties";

type TileInfo = TilesetTile & { gid?: number }

export class Tile extends TiledProperties {
    constructor(public tile: TileInfo | { gid: number }) {
        super(tile)
        Object.assign(this, tile)
    }
}

export interface Tile extends TileInfo {}