import { RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        sprite.eventMode = 'static'
        sprite.on('click', (event) => {
            console.log('ok')
            //console.log(event)
        })
    }
}

export default sprite