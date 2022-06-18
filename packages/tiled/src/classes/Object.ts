import { TiledObject } from "../types/Objects";
import { TileGid } from "./Gid";

export class TiledObjectClass extends TileGid {
    constructor(object: TiledObject) {
        super(object)
        Object.assign(this, object)
    }
}

export interface TiledObjectClass extends TiledObject {}