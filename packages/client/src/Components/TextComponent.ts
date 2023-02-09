import { TextComponentObject } from "@rpgjs/types"
import { AbstractComponent } from "./AbstractComponent"
import { RpgComponent } from "./Component"

export class TextComponent extends AbstractComponent<TextComponentObject, PIXI.Text> {
    static readonly id: string = 'text'
    cacheParams: string[] = []
    private container: PIXI.Text = new PIXI.Text('')

    constructor(component: RpgComponent, value: TextComponentObject['value']) {
        super(component, value)
        this.create()
    }

    create() {
        if (typeof this.value == 'string') {
            this.container.text = this.value
        } else  {
            this.container.style = this.value.style
            this.container.text = this.value.text
        }
        this.parseTextAndCache(this.container.text)
    }

    updateRender(object: any) {
        this.container.text = this.replaceText(object, this.container.text)
    }

}