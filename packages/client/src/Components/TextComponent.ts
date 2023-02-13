import { TextComponentObject } from "@rpgjs/types"
import { AbstractComponent } from "./AbstractComponent"

export class TextComponent extends AbstractComponent<TextComponentObject, PIXI.Text> {
    static readonly id: string = 'text'
    cacheParams: string[] = []
    private container: PIXI.Text = new PIXI.Text('')
    private originValue: string = ''

    onInit(cell: PIXI.Graphics) {
        if (typeof this.value == 'string') {
            this.container.text = this.value
        } else  {
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
        this.updateRender({})
        this.addChild(this.container)
        super.onInit(cell)
    }

    updateRender(object: any) {
        this.container.text = this.replaceText(object, this.originValue)
    }
}