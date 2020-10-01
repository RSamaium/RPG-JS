import { RpgMap, MapData } from '@rpgjs/server'
import { ChestEvent } from '../events/chest'

@MapData({
    id: 'medieval',
    file: require('./tmx/medieval.tmx'),
    name: 'Town',
    events: [
        [ChestEvent(), 10, 5]
    ]
})
export class MedievalMap extends RpgMap {
}