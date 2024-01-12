import { Direction } from '@rpgjs/common'
import { Animation } from '../Effects/AnimationCharacter'

export const RMSpritesheet = (framesWidth: number, framesHeight: number, frameStand: number = 1) => {

    if (framesWidth <= frameStand) {
        frameStand = framesWidth - 1
    }

    const frameY = direction => {
        const gap = Math.max(4 - framesHeight, 0)
        return {
            [Direction.Down]: 0,
            [Direction.Left]: Math.max(0, 1 - gap),
            [Direction.Right]: Math.max(0, 2 - gap),
            [Direction.Up]: Math.max(0, 3 - gap)
        }[direction]
    }

    const stand = (direction: number) => [{ time: 0, frameX: frameStand, frameY: frameY(direction) }]
    const walk = direction => {
        const array: any = []
        const durationFrame = 10
        for (let i = 0; i < framesWidth; i++) {
            array.push({ time: i * durationFrame, frameX: i, frameY: frameY(direction) })
        }
        array.push({ time: array[array.length - 1].time + durationFrame })
        return array
    }

    return {
        textures: {
            [Animation.Stand]: {
                animations: direction => [stand(direction)]
            },
            [Animation.Walk]: {
                animations: direction => [walk(direction)]
            }
        },
        framesHeight,
        framesWidth
    }
}
