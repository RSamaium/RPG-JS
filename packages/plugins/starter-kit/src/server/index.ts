import { SampleMap } from './maps/samplemap'
import { MapZ } from './maps/mapz'
import databaseList  from './database'
import { CaveMap } from './maps/cave';
import { HookServer, RpgPlayer } from '@rpgjs/server'

export default function({ RpgPlugin }) {
    RpgPlugin.on(HookServer.AddMap, () => {
        return [
            SampleMap,
            MapZ,
            CaveMap
        ]
    })
    RpgPlugin.on(HookServer.AddDatabase, () => {
        return databaseList
    })
    RpgPlugin.on(HookServer.PlayerConnected, (player: RpgPlayer) => {
        player.setHitbox(20, 16) 
        player.setGraphic('male1_2')
        player.changeMap('cave')
        player.setActor(databaseList.Hero) 
    })
}