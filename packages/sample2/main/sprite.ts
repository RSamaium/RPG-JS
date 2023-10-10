import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        sprite.eventMode = 'static'
        sprite.on('pointerdown', () => {
            sprite.guiDisplay = !sprite.guiDisplay
        })
    }
}

export default sprite