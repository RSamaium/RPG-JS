import { RpgMap, MapData } from '@rpgjs/server'
import { MonsterEvent } from '../events/enemy';

@MapData({
    id: 'overworld',
    file: require('./overworld.tmx'),
    events: [
        { event: MonsterEvent, x: 0, y: 0 }
    ]
})
export class OverWorldMap extends RpgMap {}