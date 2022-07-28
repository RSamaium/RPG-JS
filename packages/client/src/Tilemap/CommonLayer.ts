import { Layer } from "@rpgjs/tiled"
import TileMap from './index'

export class CommonLayer extends PIXI.Container {
    constructor(protected layer: Layer, protected map: TileMap) {
        super()
        this.applyProperties()
      }

    applyProperties() {
        this.alpha = this.layer.opacity ?? 1
        this.visible = this.layer.visible ?? true
        this.x = this.layer.offsetx ?? 0
        this.y = this.layer.offsety ?? 0
    }
}