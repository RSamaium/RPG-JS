import { RpgModule, RpgServer, RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { SampleMap } from './maps/samplemap'
import { MapZ } from './maps/mapz'
import { CaveMap } from './maps/cave';
import databaseList from './database'

let serverEngine

@RpgModule<RpgServer>({
    maps: [
        SampleMap,
        MapZ,
        CaveMap,
    ],
    database: databaseList,
    player: {
        onConnected(player: RpgPlayer) {
            player.setHitbox(20, 16) 
            player.setGraphic('male1_2')
            if (!serverEngine.globalConfig.startMap) {
                player.changeMap('medieval')
            }
            player.setActor(databaseList.Hero) 
        }
    },
    engine: {
        onStart(engine: RpgServerEngine) {
            serverEngine = engine
        }
    }
})
export default class RpgServerModule {}