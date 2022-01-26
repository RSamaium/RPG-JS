import { RpgServer, RpgModule } from '@rpgjs/server'
import { CaveMap } from './cave'
import { player } from './player'

@RpgModule<RpgServer>({ 
    player,
    maps: [
        CaveMap
    ]
})
export default class RpgServerEngine {}