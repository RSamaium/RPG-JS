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
        stand: 1
    }
})
export class Characters { }