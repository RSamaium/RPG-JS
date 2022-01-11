import { Spritesheet, Timeline, Ease } from '@rpgjs/client'
import { EmotionBubble } from '../emotion'

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
        [EmotionBubble.Confusion]: [0, 0],
        [EmotionBubble.Question]: [1, 0],
        [EmotionBubble.LikeBreak]: [2, 0],
        [EmotionBubble.Exclamation]: [3, 0],
        [EmotionBubble.TwoDot]: [4, 0],
        [EmotionBubble.Dollar]: [5, 0],
        [EmotionBubble.Stars]: [0, 1],
        [EmotionBubble.Music]: [1, 1],
        [EmotionBubble.Like]: [2, 1],
        [EmotionBubble.Exclamation2]: [3, 1],
        [EmotionBubble.OneDot]: [4, 1],
        [EmotionBubble.Jaded]: [5, 1],
        [EmotionBubble.Star]: [0, 2],
        [EmotionBubble.HaHa]: [1, 2],
        [EmotionBubble.Sad]: [2, 2],
        [EmotionBubble.Beads]: [3, 2],
        [EmotionBubble.Cross]: [4, 2],
        [EmotionBubble.Hangry]: [5, 2],
        [EmotionBubble.zZ]: [0, 3],
        [EmotionBubble.Idea]: [1, 3],
        [EmotionBubble.Happy]: [2, 3],
        [EmotionBubble.Bead]: [3, 3],
        [EmotionBubble.Cloud]: [4, 3],
        [EmotionBubble.Surprise]: [5, 3],
        [EmotionBubble.Z]: [0, 4],
        [EmotionBubble.Likes]: [1, 4],
        [EmotionBubble.Empty]: [2, 4],
        [EmotionBubble.ThreeDot]: [3, 4],
        [EmotionBubble.Circle]: [4, 4],
        [EmotionBubble.Hangry2]: [5, 4]
    }
    for (let key in options.textures) {
        options.textures[key] = icon.apply(null, options.textures[key])
    }
    @Spritesheet({
        id: 'bubble',
        image: options.image || require('./assets/bubble.png'),
        width: options.width || 192,
        height: options.height || 190,
        framesHeight: options.framesHeight || 5,
        framesWidth: options.framesWidth || 6,
        anchor: options.anchor || [0.5],
        y: options.y || -40,
        x: options.x || 10,
        ...options
    })
    class EmoteSprite {}
    return EmoteSprite
}