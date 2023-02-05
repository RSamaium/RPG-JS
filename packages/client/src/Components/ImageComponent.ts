import { SceneMap } from "../Scene/Map"
import { RpgComponent } from "./Component"
import { Container, Sprite } from "pixi.js"

export class ImageComponent extends Container {
    static readonly id: string = 'image'

    constructor(private component: RpgComponent, private source: string) {
        super()
        this.setImage()
    }

    setImage() {
        const engine = this.component.getScene<SceneMap>().game.clientEngine
        this.addChild(Sprite.from(engine.getResourceUrl(this.source)))
    }
}