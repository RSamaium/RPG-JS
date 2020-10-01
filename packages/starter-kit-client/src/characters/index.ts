import { Spritesheet } from '@rpgjs/client'

@Spritesheet({
    images: {
        hero: require('./assets/chara.png')
    },
    framesWidth: 4,
    framesHeight: 4,
    width: 128,
    height: 192,
    action: {
        walk: {
            left: '4->7',
            right: '8->11',
            down: '0->3',
            up: '12->15'
        }
    }
})
export class Characters {

}