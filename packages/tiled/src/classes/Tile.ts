import { TilesetTile } from "../types/Tile";
import { TileGid } from "./Gid";

type TileInfo = TilesetTile & { gid?: number }

export class Tile extends TileGid {
    constructor(public tile: TileInfo | { gid: number }) {
        super(tile)
        Object.assign(this, tile)
    }
}

export interface Tile extends TileInfo {}