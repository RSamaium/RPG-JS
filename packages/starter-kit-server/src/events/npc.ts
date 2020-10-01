import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'Npc',
    syncAll: true
})
class NpcEvent extends RpgEvent {

    onInit() {
        this.setGraphic('hero')
    }

    async onAction(player: RpgPlayer) {
        await player.showText('')
    }
}