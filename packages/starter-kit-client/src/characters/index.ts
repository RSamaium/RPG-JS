import { Spritesheet } from '@rpgjs/client'

@Spritesheet({
    images: {
        hero: require('./assets/Male 01-1.png'),
        hero2: require('./assets/Male 01-2.png')
    },
    framesWidth: 3,
    framesHeight: 4,
    width: 96,
    height: 128,
    action: {
        walk: {
            left: '4->7',
            right: '8->11',
            down: '0->3',
            up: '12->15'
        },
        stand: 1
    }
})
export class Characters {

}