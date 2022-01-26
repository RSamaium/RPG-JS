import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning, Control, RpgEvent, EventData } from '@rpgjs/server'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

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
            //player.canMove = true
            //player.callMainMenu()
            
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