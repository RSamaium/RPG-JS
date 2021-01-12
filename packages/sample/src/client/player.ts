import { RpgSprite } from '@rpgjs/client'

export class Sprite extends RpgSprite {

    debug

    nameText: PIXI.Text = new PIXI.Text('', {
        fontSize: 13
    })

    onInit() {
        this.nameText.y =- 25
        this.nameText.x += 15
        this.nameText.anchor.set(0.5)
        this.addChild(this.nameText)    
    }

    onChanges(data) {
        const name = data.name
        if (this.isPlayer && name) {
            this.nameText.text = name
        }
    }
}