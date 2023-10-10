import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        sprite.eventMode = 'static'
        sprite.on('pointerdown', () => {
            console.log('oo')
            sprite.guiDisplay = !sprite.guiDisplay
        })
    }
}

export default sprite