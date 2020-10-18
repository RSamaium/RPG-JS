import { RpgMap, MapData } from '@rpgjs/server'

@MapData({
    id: 'mapz',
    file: require('./tmx/mapz.tmx')
})
export class MapZ extends RpgMap {
}