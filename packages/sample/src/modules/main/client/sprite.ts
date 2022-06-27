import { RpgSprite, RpgSpriteHooks, RpgComponent } from '@rpgjs/client'

export const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgComponent) {
        sprite.interactive = true
        sprite.on('click', () => {
            sprite.guiDisplay = !sprite.guiDisplay
        })
    }
}