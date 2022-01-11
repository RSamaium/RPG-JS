import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning } from '@rpgjs/server'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        player.name = ''+Math.random()
        console.log('Enter', player.name)
        player.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })
        
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == 'back') {
            player.callMainMenu()
        }
    },
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
        player.showEmotionBubble(EmotionBubble.zZ)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
}