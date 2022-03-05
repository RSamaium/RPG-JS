import { RpgMap, MapData, EventData, RpgEvent } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
class MyEvent extends RpgEvent {
    
}

@MapData({
    id: 'cave',
    file: require('./tmx/cave.tmx'),
    events: [MyEvent]
})
export class CaveMap extends RpgMap {
    
}