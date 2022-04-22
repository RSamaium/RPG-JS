import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        town: require('./assets/Town_Theme.ogg'),
    },
    loop: true,
    volume: 0.5
})
export class Musics {}