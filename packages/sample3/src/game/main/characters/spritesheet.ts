
import { Animation, Spritesheet, Direction } from '@rpgjs/client'

const LPCSpritesheetPreset = () => {
    const frameY = (direction: Direction) => {
        return {
            [Direction.Down]: 2,
            [Direction.Left]: 1,
            [Direction.Right]: 3,
            [Direction.Up]: 0
        }[direction]
    }

    const stand = (direction: Direction) => [{ time: 0, frameX: 0, frameY: frameY(direction) }]
    const anim = (direction: Direction, framesWidth: number, speed: number = 5) => {
        const array: any = []
        for (let i = 0; i < framesWidth; i++) {
            array.push({ time: i * speed, frameX: i, frameY: frameY(direction) })
        }
        return array
    }

    const ratio = 1.5

    return {
        rectWidth: 64 * ratio,
        rectHeight: 64 * ratio,
        spriteRealSize: {
            width: 48 * ratio,
            height: 52 * ratio,
        },
        framesWidth: 6,
        framesHeight: 4,
        textures: {
            [Animation.Stand]: {
                offset: {
                    x: 0,
                    y: 512 * ratio,
                },
                animations: (direction: Direction) => [stand(direction)]
            },
            [Animation.Walk]: {
                offset: {
                    x: 0,
                    y: 512 * ratio,
                },
                framesWidth: 9,
                framesHeight: 4,
                animations: (direction: Direction) => [anim(direction, 9)]
            },
            [Animation.Attack]: {
                offset: {
                    x: 0,
                    y: 768 * ratio,
                },
                framesWidth: 6,
                framesHeight: 4,
                animations: (direction: Direction) => [anim(direction, 6, 3)]
            },
            [Animation.Skill]: {
                framesWidth: 7,
                framesHeight: 4,
                animations: (direction: Direction) => [anim(direction, 7, 3)]
            }
        },
    }
}

@Spritesheet({
    ...LPCSpritesheetPreset(),
})
export default class LPCSpritesheet {
}
