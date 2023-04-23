import { RpgServer, RpgModule, RpgPlayer } from '@rpgjs/server'
import { CaveMap, SampleMap } from './cave'
import { player, Shield } from './player'
import WorldMap from './tmx/world.world'

@RpgModule<RpgServer>({ 
    player,
    database: {
        Shield
    },
    maps: [
        // SampleMap,
        // CaveMap
    ],
    worldMaps: [ 
        WorldMap
    ] 
})
export default class RpgServerEngine {} 