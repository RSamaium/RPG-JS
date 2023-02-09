import { RpgComponent } from "./Component"
import { Utils } from "@rpgjs/common"

export class ColorComponent extends PIXI.Graphics {
    static readonly id: string = 'color'

    constructor(private component: RpgComponent, public color: string) {
        super()
        this.setBackgroundColor()
    }

    setBackgroundColor() {
        this.beginFill(Utils.hexaToNumber(this.color))
        this.drawRect(
            0,
            0,
            this.component.w,
            this.component.h
        );
        this.endFill()
    }
}