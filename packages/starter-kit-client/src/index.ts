import { MedievalTilesets } from './maps/medieval'
import Characters from './characters'
import { Images } from './images'
import { Sounds } from './sounds'
import { Animations } from './animations'

export const spritesheets = [
    MedievalTilesets,
    ...Characters,
    Images,
    Animations
]

export const sounds = [
    Sounds
]