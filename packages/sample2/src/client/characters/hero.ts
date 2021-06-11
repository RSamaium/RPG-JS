import { Spritesheet, Animation, Direction, RpgSprite } from '@rpgjs/client'

const frameY = direction => {
    return {
        [Direction.Down]: 0,
        [Direction.Left]: 3,
        [Direction.Right]: 1, 
        [Direction.Up]: 2
    }[direction]
}

const frameAttackY = direction => {
    return {
        [Direction.Down]: 0,
        [Direction.Left]: 3,
        [Direction.Right]: 2, 
        [Direction.Up]: 1
    }[direction]
}

@Spritesheet({
    id: 'hero',
    image: require('./character.png'),
    framesWidth: 4,
    framesHeight: 4, 
    width: 272,
    height: 256,
    anchorBySize: [16, 24],
    textures: {
        [Animation.Stand]: {
            rectWidth: 16,
            rectHeight: 32,
            animations: direction => [
                [{ time: 0, frameX: 2, frameY: frameY(direction) }]
            ]
        },
        [Animation.Walk]:  {
            rectWidth: 16,
            rectHeight: 32,
            animations: direction => [
                    [ 
                        { time: 0, frameX: 0, frameY: frameY(direction) },
                        { time: 5, frameX: 1, frameY: frameY(direction) },
                        { time: 10, frameX: 2, frameY: frameY(direction) },
                        { time: 15, frameX: 3, frameY: frameY(direction) }
                    ]
                ]
         },
         attack:  {
            rectWidth: 32,
            rectHeight: 32,
            offset: { y: 128, x: 0 },
            animations:  (direction) => {
                return [
                    [ 
                        { time: 0, frameX: 0, frameY: frameAttackY(direction) },
                        { time: 5, frameX: 1, frameY: frameAttackY(direction) },
                        { time: 10, frameX: 2, frameY: frameAttackY(direction) },
                        { time: 25, frameX: 3, frameY: frameAttackY(direction) }
                    ]
                ]
            }
         }
    }
})
export class HeroCharacter {
    onCharacterAttack(sprite: RpgSprite) {
        sprite.animation.play('attack', [sprite.dir])
    }
}