import { Utils } from "@rpgjs/common"
import { AbstractComponent, CellInfo } from "./AbstractComponent"
import { DebugComponentObject } from "@rpgjs/types"

export class DebugComponent extends AbstractComponent<DebugComponentObject, PIXI.Graphics> {
    static readonly id: string = 'debug'
    color: string = '#000000'
    cacheParams: string[] = ['map', 'position.x', 'position.y']
    private container: PIXI.Graphics = new PIXI.Graphics()

    onInit(cell: CellInfo) {
        this.addChild(this.container)
        this.updateRender(this.component.logic)
        super.onInit(cell)
    }

    updateRender(object: any) {
        const hitbox = object.hitbox
        const { pos, w, h } = hitbox
        this.container.clear()
        this.container.lineStyle(2, Utils.hexaToNumber(this.color))
        this.container.drawRect(0, 0, w, h)
    }
}