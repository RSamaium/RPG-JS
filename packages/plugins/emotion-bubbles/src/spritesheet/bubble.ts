import { Spritesheet, Timeline, Ease } from '@rpgjs/client'

const icon = (frameX, frameY) => {
    return {
        animations: new Timeline()
            .add(30, ({ scale }) => [{
                frameX,
                frameY,
                scale: [scale]
            }], {
                scale: {
                    from: 0,
                    to: 1,
                    easing: Ease.easeOutBounce
                }
            })
            .add(100)
            .add(30, ({ scale }) => [{
                frameX,
                frameY,
                scale: [scale]
            }], {
                scale: {
                    from: 1,
                    to: 0,
                    easing: Ease.easeInBounce
                }
            })
            .create()
    }
}

export function Emote(options: any = {}) {
    if (!options.textures) options.textures = {
        confusion: [0, 0],
        like: [2, 1]
    }
    for (let key in options.textures) {
        options.textures[key] = icon.apply(null, options.textures[key])
    }
    @Spritesheet({
        id: 'bubble',
        image: require('./assets/bubble.png'),
        width: 192,
        height: 190,
        framesHeight: 5,
        framesWidth: 6,
        anchor: [0.5],
        y: -40,
        ...options
    })
    class EmoteSprite {}
    return EmoteSprite
}