import { RpgComponent } from "./Component"
import { Graphics } from "pixi.js"

export class ColorComponent extends Graphics {
    static readonly id: string = 'color'

    constructor(private component: RpgComponent, public color: string) {
        super()
        this.setBackgroundColor()
    }

    setBackgroundColor() {
        const color = this.color.replace('#', '')
        this.beginFill(parseInt(color, 16))
        this.drawRect(
            0,
            0,
            this.component.w,
            this.component.h
        );
        this.endFill()
    }
}