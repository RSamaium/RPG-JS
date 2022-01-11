import { RpgPlayer } from '@rpgjs/server'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        showEmotionBubble: (emotion: string) => void
    }
}

RpgPlayer.prototype.showEmotionBubble = function(emotion: string) {
    this.showAnimation('bubble', emotion)
} 