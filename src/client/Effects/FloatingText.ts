import * as PIXI from 'pixi.js'
import TWEEN from '@tweenjs/tween.js'

export class FloatingText extends PIXI.Text {

    private tween: any

    constructor(str: string, style?: object) {
        super(str, style)
        this.tween = new TWEEN.Tween({
            y: 0, 
            alpha: 1
        })
            .easing(TWEEN.Easing.Quadratic.Out)
            .to({ y: -100, alpha: 0}, 800)
            .onUpdate((object) => {
                this.y = object.y
                this.alpha = object.alpha
            })
    }

    run() {
       return new Promise((resolve) => {
            this.tween
                .start()
                .onComplete(resolve)
       })
    }

    update() {
        TWEEN.update(TWEEN.now())
    }
}