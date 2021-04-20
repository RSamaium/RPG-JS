import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        town: require('./assets/Town_Theme.ogg')
    },
    loop: true
})
export class Sounds {}