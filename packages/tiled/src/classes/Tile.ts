import { TilesetTile } from "../types/Tile";
import { TileGid } from "./Gid";

type TileInfo = TilesetTile & { gid?: number, index: number, layerIndex?: number }

export class Tile extends TileGid {
    index: number

    constructor(public tile: TileInfo | { gid: number }) {
        super(tile)
        Reflect.deleteProperty(tile, 'gid')
        Object.assign(this, tile)
    } 
}

export interface Tile extends TileInfo {}