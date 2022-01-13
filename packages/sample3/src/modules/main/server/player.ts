import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning, Control } from '@rpgjs/server'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        map.createShape({ 
            x: 10,
            y: 10,
            width: 100,
            height: 100,
            properties: {
                color: '0xDE3249'
            }
        })
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            player.callMainMenu()
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