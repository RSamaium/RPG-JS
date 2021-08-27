import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        connect: require('./assets/confirmation_002.ogg'),
        disconnect: require('./assets/error_002.ogg')
    }
})
export class GamePadSounds {}