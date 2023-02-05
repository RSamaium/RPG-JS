import { Layer } from "@rpgjs/tiled"
import TileMap from './index'
import { Container } from "pixi.js"

export class CommonLayer extends Container {
    z: number

    constructor(protected layer: Layer, protected map: TileMap) {
        super()
        this.applyProperties()
    }

    applyProperties() {
        this.alpha = this.layer.opacity ?? 1
        this.visible = this.layer.visible ?? true
        this.x = this.layer.offsetx ?? 0
        this.y = this.layer.offsety ?? 0
        this.z = this.layer.properties.z ?? 0
    }
}