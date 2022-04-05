import { RpgMap, MapData, EventData, RpgEvent, Move, EventMode } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
class MyEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female13')
        this.setHitbox(32, 16)
        this.frequency = 150  
        this.infiniteMoveRoute([ Move.tileRandom() ])
    }
    onAction() {
        console.log('ok')
    }
}

@MapData({
    id: 'cave',
    file: require('./tmx/cave.tmx'),
    //events: [MyEvent]
})
export class CaveMap extends RpgMap {
    
}

@MapData({
    id: 'samplemap',
    file: require('./tmx/samplemap.tmx')
})
export class SampleMap extends RpgMap {
    
}