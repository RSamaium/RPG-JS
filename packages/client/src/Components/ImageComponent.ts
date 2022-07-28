import { SceneMap } from "../Scene/Map"
import { RpgComponent } from "./Component"

export class ImageComponent extends PIXI.Container {
    static readonly id: string = 'image'

    constructor(private component: RpgComponent, private source: string) {
        super()
        this.setImage()
    }

    setImage() {
        const engine = this.component.getScene<SceneMap>().game.clientEngine
        this.addChild(PIXI.Sprite.from(engine.getResourceUrl(this.source)))
    }
}