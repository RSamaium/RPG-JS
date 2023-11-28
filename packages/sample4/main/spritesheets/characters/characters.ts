import { Spritesheet, Presets, Direction, Animation } from '@rpgjs/client'

const RMSpritesheet = (framesWidth: number, framesHeight: number, frameStand = 1) => {
    const frameY = direction => {
        return {
            [Direction.Down]: 0,
            [Direction.Left]: 1,
            [Direction.Right]: 2,
            [Direction.Up]: 3
        }[direction]
    }

    const stand = (direction: number) => [{ time: 0, frameX: frameStand, frameY: frameY(direction) }]
    const walk = (direction: Direction, params: any) => {
        const array: any = []
        const durationFrame = 10
        for (let i = 0; i < framesWidth; i++) {
            array.push({
                time: i * durationFrame,
            frameX: i,
                frameY: frameY(direction),
            })
        }
        array.push({ time: array[array.length - 1].time + durationFrame })
        return array
    }

    return {
        textures: {
            [Animation.Stand]: {
                animations: (direction, rotation) => [stand(direction)]
            },
            [Animation.Walk]: {
                animations: (direction: Direction, rotation: number) => [walk(direction, rotation)]
            }
        },
        framesHeight,
        framesWidth
    }
}

@Spritesheet({
    ...RMSpritesheet(3, 4)
})
export default class Characters { }
