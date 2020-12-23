import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        town: require('./assets/Town_Theme.wav')
    },
    loop: true
})
export class Sounds {}