import { RpgModule, RpgServer } from '@rpgjs/server'
import { SampleMap } from './maps/samplemap'
import { MapZ } from './maps/mapz'
import { CaveMap } from './maps/cave';
import databaseList  from './database'
import { player } from './player'

@RpgModule<RpgServer>({
    maps: [
        SampleMap,
        MapZ,
        CaveMap,
    ],
    database: {
        databaseList
    },
    player
})
export default class RpgServerEngine {}