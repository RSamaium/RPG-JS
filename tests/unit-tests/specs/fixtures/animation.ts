import { Spritesheet } from '@rpgjs/client'

export function createSprite({
    parent = {},
    animation = {}
} = {}) {
    @Spritesheet({
        id: 'shield',
        image: require('./spritesheets/sample.png'),
        framesWidth: 5,
        framesHeight: 4,
        width: 960,
        height: 768,
        textures: {
            default: {
                animations: [
                    [
                        { time: 0, frameX: 0, frameY: 0 },
                        { time: 5, frameX: 1, frameY: 0 },
                    ]
                ],
                ...animation
            }
        },
        ...parent
    })
    class ShieldAnimations { }
    return ShieldAnimations
}
