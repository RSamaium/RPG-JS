import { RpgServer, RpgModule } from '@rpgjs/server'
import { CaveMap, SampleMap } from './cave'
import { player } from './player'

import WorldMap from './tmx/world.world'

console.log(WorldMap)

let last
@RpgModule<RpgServer>({ 
    player,
    engine: {
        onStep() {
            if (last) {
                const time = Date.now() - last
                //process.stdout.write(time + 'ms\r');
            }
            last = Date.now()
        }
    },
    // maps: [
    //     CaveMap,
    //     SampleMap
    // ],
    worldMaps: [ 
        WorldMap
    ]
})
export default class RpgServerEngine {}