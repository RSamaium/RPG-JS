import { RpgModule, RpgClient } from '@rpgjs/client'
import { MedievalTilesets } from './maps/medieval'
import Characters from './characters'
import { Images } from './images'
import { Musics, Sounds } from './sounds'
import { Animations } from './animations'

@RpgModule<RpgClient>({
    spritesheets: [
        MedievalTilesets,
        ...Characters,
        Images,
        Animations
    ],
    sounds: [
        Musics,
        Sounds
    ]
})
export default class RpgClientEngine {}