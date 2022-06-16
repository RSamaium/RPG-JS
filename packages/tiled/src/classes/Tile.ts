import { TilesetTile } from "../types/Tile";
import { TiledProperties } from "./Properties";

export class Tile extends TiledProperties {
    constructor(tile: TilesetTile) {
        super(tile)
        Object.assign(this, tile)
    }
}

export interface Tile extends TilesetTile {}