import { TiledLayer } from "@rpgjs/tiled";
import { Container } from "pixi.js";

export class EventLayer extends Container {
    static readonly EVENTS_LAYER_DEFAULT : string = 'events-layer-default'

    constructor(private layer: TiledLayer) {
        super()
        this.sortableChildren = true
    }
}