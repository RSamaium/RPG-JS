import { Spritesheet } from '@rpgjs/client'

const to = () => {
    const array: any = []
    let k = 0
    for (let i=0 ; i < 4 ; i++) {
        for (let j=0 ; j < 5 ; j++) {
            array.push({ time: k * 5, frameX: j, frameY: i })
            k++
        }
    }
    return array
}

@Spritesheet({
    id: 'shield-b',
    image: require('./assets/animation.png'),
    framesWidth: 5,
    framesHeight: 4,
    width: 960,
    height: 768,
    opacity: 1,
    anchor: [0.5],
    textures: {
        default: {
            /*
            animations: [
                [ 
                    { time: 0, frameX: 0, frameY: 0 },
                    { time: 5, frameX: 1, frameY: 0 } ,
                    { time: 10, frameX: 2, frameY: 0 } ,
                    { time: 15, frameX: 3, frameY: 0 }
                    // etc...
                ]
            ]
            */
            animations: [ to() ]
        }
    }
})
export class ShieldAnimations {}