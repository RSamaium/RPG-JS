import { TiledLayer } from "./Layer";
import { TiledObject } from "./Objects";
import { TiledFrame, TiledProperty } from "./Types";

export interface TilesetTile {
    id: number;
    type: string;
    image: string;
    imageheight: number;
    imagewidth: number;
    animation: TiledFrame[];
    properties: TiledProperty[];
    terrain: number[];
    objects: TiledObject[];
    probability: number;
 }