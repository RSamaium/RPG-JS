import { Direction } from '@rpgjs/common'
import { Animation } from '../Effects/AnimationCharacter'

export const RMSpritesheet = (framesWidth, framesHeight, frameStand = 1) => {

    const frameY = direction => {
        return {
            [Direction.Down]: 0,
            [Direction.Left]: 1,
            [Direction.Right]: 2,
            [Direction.Up]: 3
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
