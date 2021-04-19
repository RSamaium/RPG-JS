export default function({ RpgPlugin, RpgPlayer }, options) {
    RpgPlayer.prototype.showEmotionBubble = function(emotion: string) {
        this.showAnimation('bubble', emotion)
    }
}