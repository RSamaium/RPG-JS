import { RpgMap, MapData } from '@rpgjs/server'
import { MonsterEvent } from '../events/enemy';

@MapData({
    id: 'overworld',
    file: require('./overworld.tmx'),
    events: [
        MonsterEvent
    ]
})
export class OverWorldMap extends RpgMap {}