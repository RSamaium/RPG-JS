import { RpgMap, MapData } from '@rpgjs/server'
import { NpcEvent } from '../events/npc'
import { ShopEvent } from '../events/shop'
import { Villager1Event } from '../events/villager1';
import { Villager2Event } from '../events/villager2';

@MapData({
    id: 'medieval',
    file: require('./tmx/samplemap.tmx'),
    name: 'Town',
    events: [
        Villager1Event,
        Villager2Event,
        NpcEvent({
            name: 'EV-2',
            text: 'I find this city very quiet!',
            graphic: 'female13',
            moveRandom: true
        }),
        NpcEvent({
            name: 'EV-3',
            text: 'It is beautiful today!',
            graphic: 'female19',
            moveRandom: true
        }),
        ShopEvent
    ],
    sounds: ['town']
})
export class SampleMap extends RpgMap {
}