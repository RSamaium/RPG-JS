import { RpgEvent, EventData, RpgPlayer, Move } from '@rpgjs/server'

@EventData({
    name: 'EV-4', 
    hitbox: {
        width: 32,
        height: 16
    }
})
export class Villager2Event extends RpgEvent {
    onInit() {
        this.speed = 2
        this.frequency = 300
        this.setGraphic('male17')
        this.infiniteMoveRoute([ Move.tileRandom() ])
    }
    async onAction(player: RpgPlayer) {
        if (!player.getVariable('ASK_BROTHER')) {
            await player.showText('I think you should talk to my brother, he\'s in the northwestern part of the village.', {
                talkWith: this
            })
            return
        }
        if (player.getVariable('GAIN_GOLD')) {
            await player.showText('Were you able to buy the dungeon key?', {
                talkWith: this
            })
            return
        }
        const choice = await player.showChoices('My brother wants the key to the dungeon. To buy it, you must have gold. Do you want it?', [
            { value: true, text: 'Yes' },
            { value: false, text: 'No' }
        ], {
            talkWith: this
        })
        if (choice && choice.value) {
            await player.showText('Here is 1000 Gold then!', {
                talkWith: this
            })
            player.gold += 1000
            player.setVariable('GAIN_GOLD', true)
        }
        else {
            await player.showText('Too bad for you!', {
                talkWith: this
            })
        }
    }
}