import { RpgMap, MapData } from '@rpgjs/server'
import { NpcEvent } from '../events/npc'

@MapData({
    id: 'medieval',
    file: require('./tmx/samplemap.tmx'),
    name: 'Town',
    events: [
        NpcEvent({
            name: 'EV-1',
            text: 'Welcome to the RPGJS demo!',
            graphic: 'male12'
        })
    ],
    sounds: ['town']
})
export class SampleMap extends RpgMap {
}