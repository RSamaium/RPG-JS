import { TiledLayer } from "@rpgjs/tiled";
import { Container } from "pixi.js";

export class EventLayer extends Container {
    constructor() {
        super()
        this.sortableChildren = true
    }
}