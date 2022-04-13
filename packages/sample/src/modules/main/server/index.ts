import { RpgServer, RpgModule } from '@rpgjs/server'
import { CaveMap, SampleMap } from './cave'
import { player } from './player'

//import WorldMap from './tmx/world.world'

//console.log(WorldMap)

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
        {
            id: 'myworld',
            "maps": [
                {
                    "fileName": require("./tmx/cave.tmx"),
                    "height": 6400,
                    "width": 6400,
                    "x": 352,
                    "y": 1248
                },
                {
                    "fileName": require("./tmx/samplemap.tmx"),
                    "height": 1920,
                    "width": 1920,
                    "x": 448,
                    "y": -672
                }
            ],
            "onlyShowAdjacentMaps": false,
            "type": "world"
        }
    ]
})
export default class RpgServerEngine {}