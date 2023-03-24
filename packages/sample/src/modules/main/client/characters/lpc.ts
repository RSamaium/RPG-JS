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
        light: require('./assets/light.png'),
        shield: require('./assets/kite_blue_blue.png'),
        jedi: require('./assets/Jedi.png')
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
                new Array(8).fill(0).map((_, i) => {
                    return { time: i*5, frameX: i+1, frameY: getDirection(direction) }
                })
            ]
        },
        [Animation.Attack]: {
            width: 1536,
            height: 2112,
            rectWidth: 192,
            rectHeight: 192,
            framesWidth: 6,
            framesHeight: 4,
            offset: {x: 0, y: 1344},
            animations: direction => [
                new Array(7).fill(0).map((_, i) => {
                    const mapDirection = {
                        [Direction.Up]: 0,
                        [Direction.Left]: 1,
                        [Direction.Down]: 2,
                        [Direction.Right]: 3,          
                    }[direction]
                    return { time: i*5, frameX: i, frameY: mapDirection }
                })
            ]
        }
    }
})
export class LPC { } 