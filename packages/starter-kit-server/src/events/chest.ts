import { RpgEvent, EventData, RpgPlayer, Query } from '@rpgjs/server'
import { Potion } from '../database/items/potion'

@EventData({
    name: 'EV-1',
    syncAll: true,
    width: 32,
    height: 32,
    hitbox: {
        width: 32,
        height: 16
    }
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
       // player.addItem(Potion)
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