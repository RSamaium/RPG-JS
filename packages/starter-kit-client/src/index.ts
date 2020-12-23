import { MedievalTilesets } from './maps/medieval'
import Characters from './characters'
import { Battlebacks } from './battlebacks'
import { Animations } from './animations'
import { Battlers } from './battlers'
import { Images } from './images'
import { Sounds } from './sounds'

export const spritesheets = [
    MedievalTilesets,
    ...Characters,
    Battlebacks,
    Battlers,
    Images,
    //Animations
]

export const sounds = [
    Sounds
]