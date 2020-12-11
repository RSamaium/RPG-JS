import { RpgMap, MapData } from '@rpgjs/server'
import { ChestEvent } from '../events/chest'

@MapData({
    id: 'medieval',
    file: require('./tmx/samplemap.tmx'),
    name: 'Town',
    events: [
        ChestEvent()
    ]
})
export class SampleMap extends RpgMap {
}