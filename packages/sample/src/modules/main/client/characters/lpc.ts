import { Spritesheet, Presets, Animation, Direction } from '@rpgjs/client'

function getDirection(direction: Direction, offset: number = 0) {
    return {
        [Direction.Left]: 9 + offset,
        [Direction.Right]: 11 + offset,
        [Direction.Up]: 8 + offset,
        [Direction.Down]: 10 + offset
    }[direction]
}

@Spritesheet({
    images: {
        light: 'light.png',
        shield: 'kite_blue_blue.png'
    },
    width: 832,
    height: 1344,
    framesWidth: 13,
    framesHeight: 21,
    textures: {
        [Animation.Stand]: {
            animations: direction => [
                [
                    { time: 0, frameX: 0, frameY: getDirection(direction) }
                ]
            ]
        },
        [Animation.Walk]: {
            animations: direction => [
                new Array(9).fill(0).map((_, i) => {
                    return { time: i*5, frameX: i, frameY: getDirection(direction) }
                })
            ]
        },
        attack: {
            animations: direction => [
                new Array(6).fill(0).map((_, i) => {
                    return { time: i*5, frameX: i, frameY: getDirection(direction, 4) }
                })
            ]
        },
        test: {
            animations: [
                new Array(6).fill(0).map((_, i) => {
                    return { time: i*5, frameX: i, frameY: getDirection(Direction.Left, 4) }
                })
            ]
        }
    }
})
export class LPC { }