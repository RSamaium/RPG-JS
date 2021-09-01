import { Sound } from '@rpgjs/client'

@Sound({
    sounds: {
        alert: require('./sounds/confirmation_002.ogg'),
        error: require('./sounds/error_002.ogg')
    }
})
export class GuiSounds {}