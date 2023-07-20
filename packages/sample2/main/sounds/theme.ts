import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        town: require('./theme.ogg'),
    },
    loop: true
})
export default class Musics {}