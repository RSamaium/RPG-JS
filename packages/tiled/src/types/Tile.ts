import { TiledLayer } from "./Layer";
import { TiledObject } from "./Objects";
import { TiledFrame, TiledProperty } from "./Types";

export interface TilesetTile {
    gid: number
    id: number;
    type: string;
    image: string;
    imageheight: number;
    imagewidth: number;
    animations: TiledFrame[];
    properties: {
        [key: string]: any
    }
    terrain: number[];
    objects: TiledObject[];
    probability: number;
 }