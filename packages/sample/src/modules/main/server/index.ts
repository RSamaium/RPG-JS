import { RpgServer, RpgModule, RpgPlayer } from '@rpgjs/server'
import { CaveMap, SampleMap } from './cave'
import { player, Shield } from './player'
import { RedisStore } from '@rpgjs/agones/src/redisStore'

import WorldMap from './tmx/world.world'

let last
@RpgModule<RpgServer>({ 
    player,
    database: {
        Shield
    },
    engine: {
        onStep() {
            if (last) {
                const time = Date.now() - last
                //process.stdout.write(time + 'ms\r');
            }
            last = Date.now()
        }
    },
    maps: [
        CaveMap,
        SampleMap
    ],
    worldMaps: [ 
        WorldMap
    ] 
})
export default class RpgServerEngine {}