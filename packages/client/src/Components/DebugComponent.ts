import { Utils } from "@rpgjs/common"
import { AbstractComponent, CellInfo } from "./AbstractComponent"
import { DebugComponentObject } from "@rpgjs/types"
import { Graphics } from "pixi.js"

export class DebugComponent extends AbstractComponent<DebugComponentObject, Graphics> {
    static readonly id: string = 'debug'
    color: string = '#ff0000'
    cacheParams: string[] = ['map', 'position.x', 'position.y']
    private container: Graphics = new Graphics()

    onInit(cell: CellInfo) {
        this.addChild(this.container)
        this.updateRender(this.component.logic)
        this.eventMode = 'static'
        this.on('pointerdown', () => {
            console.log(this.component.logic)
        })
        super.onInit(cell)
    }

    updateRender(object: any) {
        const hitbox = object.hitbox
        const { pos, w, h } = hitbox
        this.container.clear()
        const { value: color, alpha } = Utils.hexaToNumber(this.color)
        this.container.beginFill(color, alpha)
        this.container.drawRect(
            0,
            0,
            w,
            h
        );
        this.container.endFill()
    }
}