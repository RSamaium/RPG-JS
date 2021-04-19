import { HookClient } from '@rpgjs/client'
import { MedievalTilesets } from './maps/medieval'
import Characters from './characters'
import { Images } from './images'
import { Sounds } from './sounds'
import { Animations } from './animations'

export default function({ RpgPlugin }) {
    RpgPlugin.on(HookClient.AddSpriteSheet, () => {
        return [
            MedievalTilesets,
            ...Characters,
            Images,
            Animations
        ]
    })
    RpgPlugin.on(HookClient.AddSound, () => {
        return [
            Sounds
        ]
    })
}