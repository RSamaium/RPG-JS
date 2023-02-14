import { Utils } from "@rpgjs/common"
import { AbstractComponent, CellInfo } from "./AbstractComponent"
import { ColorComponentObject } from "@rpgjs/types"

export class ColorComponent extends AbstractComponent<ColorComponentObject, PIXI.Graphics> {
    static readonly id: string = 'color'
    color: string = '#000000'
    cacheParams: string[] = []
    private container: PIXI.Graphics = new PIXI.Graphics()

    onInit(cell: CellInfo) {
        if (typeof this.value == 'string') {
            this.color = this.value
        } else {
            this.color = this.value.color
        }
        this.updateRender({})
        this.addChild(this.container)
        super.onInit(cell)
    }

    updateRender(object: any) {
        this.container.clear()
        this.container.beginFill(Utils.hexaToNumber(this.color))
        this.container.drawRect(
            0,
            0,
            this.cell?.width ?? 0,
            this.cell?.height ?? 0
        );
        this.container.endFill()
    }
}