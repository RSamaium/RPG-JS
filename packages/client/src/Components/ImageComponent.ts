import { Container, Sprite } from "pixi.js"
import { ImageComponentObject } from "@rpgjs/types"
import { SceneMap } from "../Scene/Map"
import { AbstractComponent, CellInfo } from "./AbstractComponent"

export class ImageComponent extends AbstractComponent<ImageComponentObject, Container> {
    static readonly id: string = 'image'
    cacheParams: string[] = []
    source: string = ''

    onInit(cell: CellInfo) {
        super.onInit(cell)
        this.setImage()
    }

    private setImage() {
        if (typeof this.value == 'string') {
            this.source = this.value
        } else  {
            this.source = this.value.source
        }
        this.updateRender({})
    }

    updateRender(object: any) {
        this.removeChildren()
        const engine = this.component.getScene<SceneMap>().game.clientEngine
        this.addChild(Sprite.from(engine.getResourceUrl(this.source)))
    }
}