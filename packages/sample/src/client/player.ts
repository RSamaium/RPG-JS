import { RpgSprite } from '@rpgjs/client'

export class Sprite extends RpgSprite {

    debug

    onInit() {
        this.interactive = true
        this.buttonMode = true
        this.on('pointerdown', (ev) => {
            console.log(ev)
        })
           
    }

    onChanges(data, old) {
        /*if (data.wHitbox) {
            this.debug = new PIXI.Graphics()
            const { wHitbox, hHitbox } = data
            this.debug.beginFill(0xDE3249)
            this.debug.drawRect(0, 0, wHitbox, hHitbox)
            this.debug.endFill()
            this.debug.alpha = 0.5
            this.addChild(this.debug)
        }*/
        //this.addEffect('test')
    }
}