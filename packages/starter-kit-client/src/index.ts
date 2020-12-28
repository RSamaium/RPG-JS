import { MedievalTilesets } from './maps/medieval'
import Characters from './characters'
import { Images } from './images'
import { Sounds } from './sounds'

export const spritesheets = [
    MedievalTilesets,
    ...Characters,
    Images
]

export const sounds = [
    Sounds
]