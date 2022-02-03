import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning, Control, RpgEvent, EventData } from '@rpgjs/server'
import { Armor } from '@rpgjs/database'

let i=0

@Armor({  
    name: 'Shield',
    description: 'Gives a little defense',
    price: 4000
})
export class Shield {}

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
            player.addItem(Shield)  
            if (i > 0) {
                player.equip(Shield, false)
            }
            else {
                player.equip(Shield)
            }
            i++
            //player.canMove = true
            //player.callMainMenu()
        }
        
    },
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
}