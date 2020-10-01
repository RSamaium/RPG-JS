import { RpgEvent, EventData, RpgPlayer, Query } from '@rpgjs/server'

@EventData({
    name: 'EV-1',
    syncAll: true
})
class _ChestEvent extends RpgEvent {

    onInit() {
        this.setGraphic('hero')
    }

    onChanges(player) {
        if (player.getVariable('A')) {
            return
        }
    }

    async onAction(player: RpgPlayer) {
       /* if (player.getVariable('A')) {
            await player.showText('Already open')
            return
        }
        await player.showText('You have 10 gold')
        player.gold += 10
        player.setVariable('A', true)*/ 
        //player.startBattle()
        await player.showText('You have 10 golds')
        player.gold += 10
    }

    onPlayerTouch() {
        
    }

    onEventTouch() {

    }

    onDestroy() {

    }
}

export function ChestEvent() {
    return _ChestEvent
}