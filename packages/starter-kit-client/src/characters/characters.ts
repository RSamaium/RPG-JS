import { Spritesheet } from '@rpgjs/client'

const SimpleSpritesheet = (framesWidth, framesHeight, frameStand = 1) => {

    const stand = frameY => [{ time: 0, frameX: frameStand, frameY }]
    const walk = frameY => {
        const array: any = []
        for (let i=0 ; i < framesWidth ; i++) {
            array.push({ time: i*10,  frameX: i, frameY })
        }
        return array
    }

    return {
        animations:  {
            standDown: [stand(0)],
            standUp: [stand(3)],
            standRight: [stand(2)],
            standLeft: [stand(1)],
            walkDown: [walk(0)],
            walkRight: [walk(2)],
            walkLeft: [walk(1)],
            walkUp: [walk(3)]
        },
        framesHeight,
        framesWidth
    }
}

@Spritesheet({
    images: {
        female13: require('./assets/Female 13-2.png'),
        female19: require('./assets/Female 19-3.png'),
        male1_1: require('./assets/Male 01-1.png'),
        male4_1: require('./assets/Male 04-1.png'),
        male12: require('./assets/Male 12-2.png'),
        male17: require('./assets/Male 17-2.png'),
        male1_2: require('./assets/Male 01-2.png')
    },
    width: 96,
    height: 128,
    ...SimpleSpritesheet(3, 4)
})
export class Characters { }