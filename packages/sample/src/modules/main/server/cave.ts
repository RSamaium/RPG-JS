import { RpgMap, MapData, EventData, RpgEvent, Move, EventMode, RpgPlayer } from '@rpgjs/server'
import mymap from 'rpgjs-test'

console.log(mymap)

@EventData({
    name: 'EV-1',
    hitbox: {
        width: 32,
        height: 16
    }
})
class MyEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female13')
    }
    onAction(player: RpgPlayer) {
        
    }
} 

@MapData({
    id: 'cave',
    file: require('./tmx/cave.tmx'), 
    
})
export class CaveMap extends RpgMap {
    
}

@MapData({
    id: 'samplemap',
    file: mymap,
    events: [{
        event: MyEvent,
        x: 32 *20,
        y: 32 * 20 
    }]
})
export class SampleMap extends RpgMap {
    
}