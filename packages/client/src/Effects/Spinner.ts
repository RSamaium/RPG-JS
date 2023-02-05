import { RpgClientEngine } from "../RpgClientEngine";
import { Graphics, Renderer } from "pixi.js";

export class SpinnerGraphic extends Graphics {
    constructor(private clientEngine: RpgClientEngine) {
        super()
    }

    render(renderer: Renderer) {
        super.render(renderer)
        this.rotation += 0.12;
        const percent = Math.abs(Math.sin(Date.now() / 1000))
        this
            .clear()
            .lineStyle(4, 0xffffff, 1)
            .moveTo(40, 0)
            .arc(0, 0, 40, 0, Math.PI * 2 * percent, false)
    }
}