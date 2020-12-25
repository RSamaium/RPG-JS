import { RpgMap, MapData } from '@rpgjs/server'
import { NpcEvent } from '../events/npc'
import { ShopEvent } from '../events/shop'

@MapData({
    id: 'medieval',
    file: require('./tmx/samplemap.tmx'),
    name: 'Town',
    events: [
        NpcEvent({
            name: 'EV-1',
            text: 'Welcome to the RPGJS demo!',
            graphic: 'male12'
        }),
        ShopEvent
    ],
    sounds: ['town']
})
export class SampleMap extends RpgMap {
}