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

    const stand = (direction: string) => [{ time: 0, frameX: frameStand, frameY: frameY(direction) }]
    const walk = direction => {
        const array: any = []
        for (let i=0 ; i < framesWidth ; i++) {
            array.push({ time: i*10, frameX: i, frameY: frameY(direction) })
        }
        return array
    }

    return {
        textures:  {
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
