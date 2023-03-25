import { TextComponentObject } from "@rpgjs/types"
import { Graphics, Text } from "pixi.js"
import { AbstractComponent } from "./AbstractComponent"

export class TextComponent extends AbstractComponent<TextComponentObject, Text> {
    static readonly id: string = 'text'
    cacheParams: string[] = []
    private container: Text = new Text('')
    private originValue: string = ''

    onInit(cell: Graphics) {
        if (typeof this.value == 'string') {
            this.container.text = this.value
        } else if (this.value.style) {
            this.container.style = this.value.style
            this.container.text = this.value.text
        }
        this.container.style = {
            ...this.container.style,
            wordWrapWidth: cell.width
        }
        this.parseTextAndCache(this.container.text)
        this.originValue = this.container.text
        // first render for replace variable and remove {}
        this.updateRender(this.component.logic)
        this.addChild(this.container)
        super.onInit(cell)
    }

    updateRender(object: any) {
        this.container.text = this.replaceText(object, this.originValue)
    }
}