import { RpgMap, MapData } from '@rpgjs/server'

@MapData({
    id: 'map',
    file: require('./map.tmx')
})
export class SampleMap extends RpgMap {}