import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning, Control, RpgEvent, EventData, RpgWorld } from '@rpgjs/server'
import { Armor } from '@rpgjs/database'
import { DialogPosition } from '@rpgjs/server/lib/Gui/DialogGui';

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

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        woold: number
    }
}

export const player: RpgPlayerHooks = {
    props: {
        color: String
    },
    onConnected(player: RpgPlayer) {
        player.setHitbox(16, 16)
        player.setGraphic('light')
        player.changeMap('samplemap')
    },
    onJoinMap(player: RpgPlayer, map: RpgMap) { 
        player.name = ''+Math.random()
        //player.position.z = 2 * 32
    },
    onInput(player: RpgPlayer, { input, moving }) {
        if (input == Control.Back) {
            const map = player.getCurrentMap()
            map?.setTile(320, 320, 'Tile Layer 1', { gid: 20 })
           player.setGraphic(['light', 'shield'])
        } 
    },
    async onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
        // await player.changeMap('samplemap')
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
} 