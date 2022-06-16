import { TiledObject } from "../types/Objects";
import { TiledProperties } from "./Properties";

export class TiledObjectClass extends TiledProperties {
    constructor(object: TiledObject) {
        super(object)
        Object.assign(this, object)
    }
}

export interface TiledObjectClass extends TiledObject {}