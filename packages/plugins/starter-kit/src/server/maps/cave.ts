import { RpgMap, MapData } from '@rpgjs/server'

@MapData({
    id: 'cave',
    file: require('./tmx/cave.tmx')
})
export class CaveMap extends RpgMap {}