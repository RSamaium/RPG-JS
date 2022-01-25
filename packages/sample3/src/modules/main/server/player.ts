import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning, Control, RpgEvent, EventData } from '@rpgjs/server'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

let bool = false

@EventData({
    name: 'EV-1', 
    hitbox: {
        width: 32,
        height: 16
    }
})
export class MyEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male12')
        console.log('ok')
    }
    async onAction(player: RpgPlayer) {
        await player.showText('Ok !', {
            talkWith: this
        })
    }
}

export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            //player.callMainMenu()
            const map = player.getCurrentMap()
            map.setTile(9 * 32, 13 * 32, 'Tile Layer 2', {
                gid: 6 
            })
            bool = !bool
        }
        
    },
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
        player.showEmotionBubble(EmotionBubble.Like)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
}