import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning, Control, RpgEvent, EventData, RpgWorld } from '@rpgjs/server'
import { Armor } from '@rpgjs/database'

let i=0

@Armor({  
    name: 'Shield',
    description: 'Gives a little defense',
    price: 4000
})
export class Shield {}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.setHitbox(32, 16)
        player.setGraphic('male1_2')
        player.changeMap('cave')
    },
    onJoinMap(player: RpgPlayer, map: RpgMap) { 
        
    },
    onInput(player: RpgPlayer, { input, moving }) {
        if (input == Control.Back) {
            
        }
    },
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
        player.changeMap('samplemap')
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
}