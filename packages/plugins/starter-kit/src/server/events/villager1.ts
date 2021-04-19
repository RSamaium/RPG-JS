import { RpgEvent, EventData, RpgPlayer, Move } from '@rpgjs/server'
import { Key } from '../database/items/key';

@EventData({
    name: 'EV-1', 
    hitbox: {
        width: 32,
        height: 16
    }
})
export class Villager1Event extends RpgEvent {
    onInit() {
        this.setGraphic('male12')
    }
    async onAction(player: RpgPlayer) {
        if (player.hasItem(Key)) {
            await player.showText('Great, you have the key to the dungeon! You deserve my congratulations', {
                talkWith: this
            })
            return
        }
        let texts = [
            'Welcome to the RPGJS demo!',
            'To test, I propose to bring me the key of the dungeon.',
            'You have to buy it from the seller in this village.'
        ]
        for (let msg of texts) {
            await player.showText(msg, {
                talkWith: this
            })
        }
        player.setVariable('ASK_BROTHER', true)
    }
}