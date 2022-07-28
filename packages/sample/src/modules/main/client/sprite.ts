import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

export const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        sprite.interactive = true
        sprite.on('click', () => {
            sprite.guiDisplay = !sprite.guiDisplay
        })
    }
}