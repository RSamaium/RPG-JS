import { RpgMap, MapData } from '@rpgjs/server'
import { Spritesheet } from '@rpgjs/client'

@MapData({
    id: 'map',
    file: require('./map.tmx')
})
export class SampleMap extends RpgMap {}

@Spritesheet({
    id: '[Base]BaseChip_pipo',
    image: require('./BaseChip_pipo.png')
})
export class Tileset { }