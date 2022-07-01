import { TiledObject } from "../types/Objects";
import { TileGid } from "./Gid";

export class TiledObjectClass extends TileGid {
    layerName?: string = ''

    constructor(object?: TiledObject) {
        super(object)
        Object.assign(this, object)
        if (object?.gid) {
            this.y -= this.height
        }
    }
}

export interface TiledObjectClass extends TiledObject {}