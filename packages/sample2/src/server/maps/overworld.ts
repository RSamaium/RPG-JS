import { RpgMap, MapData } from '@rpgjs/server'

@MapData({
    id: 'overworld',
    file: require('./overworld.tmx')
})
export class OverWorldMap extends RpgMap {}