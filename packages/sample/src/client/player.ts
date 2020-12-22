import { RpgSprite } from '@rpgjs/client'

export class Sprite extends RpgSprite {
    onInit() {
        console.log('init')
    }
    
    onChanges(data) {
        console.log('---', data)
    }
}