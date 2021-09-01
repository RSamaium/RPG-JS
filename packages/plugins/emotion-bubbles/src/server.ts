import { RpgPlayer } from '@rpgjs/server'

RpgPlayer.prototype.showEmotionBubble = function(emotion: string) {
    this.showAnimation('bubble', emotion)
} 