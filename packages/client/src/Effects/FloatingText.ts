import TWEEN from '@tweenjs/tween.js'

export class FloatingText extends PIXI.Text {

    private tween: any

    constructor(str: string, style?: object) {
        super(str, style)
        this.tween = new TWEEN.Tween({
            y: 0
        })
            .easing(TWEEN.Easing.Bounce.Out)
            .to({ y: 50 }, 1000)
            .onUpdate((object) => {
                this.y = object.y
            })
        const alphaTween = new TWEEN.Tween({
            alpha: 1
        }).to({ alpha: 0 }, 2000)
            .onUpdate((object) => {
                this.alpha = object.alpha
            })
        alphaTween.chain(this.tween)
        this.tween.chain(alphaTween)
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