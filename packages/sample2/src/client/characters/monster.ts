import { Spritesheet, Animation, Direction } from '@rpgjs/client'

const frameY = direction => {
    return {
        [Direction.Down]: 0,
        [Direction.Left]: 3,
        [Direction.Right]: 2, 
        [Direction.Up]: 1
    }[direction]
}

@Spritesheet({
    id: 'monster',
    image: require('./log.png'),
    framesWidth: 4,
    framesHeight: 4, 
    width: 192,
    height: 128,
    anchorBySize: [16, 24],
    textures: {
        [Animation.Stand]: {
            rectWidth: 32,
            rectHeight: 32,
            animations: direction => [
                [{ time: 0, frameX: 2, frameY: frameY(direction) }]
            ]
        },
        [Animation.Walk]:  {
            rectWidth: 32,
            rectHeight: 32,
            animations: direction => [
                    [ 
                        { time: 0, frameX: 0, frameY: frameY(direction) },
                        { time: 10, frameX: 1, frameY: frameY(direction) },
                        { time: 20, frameX: 2, frameY: frameY(direction) },
                        { time: 30, frameX: 3, frameY: frameY(direction) }
                    ]
                ]
         }
    }
})
export class MonsterCharacter { }