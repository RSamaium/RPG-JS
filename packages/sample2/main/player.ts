import { RpgPlayer, RpgPlayerHooks, Control, Components, RpgEvent, EventData, Speed } from '@rpgjs/server'


@EventData({
    name: 'EV-1',
    hitbox: {
        width: 32,
        height: 16
    }
})
class VillagerEvent extends RpgEvent {
    onInit() {
        this.speed = Speed.Fastest;
        this.setGraphic('female');
        this.through = true;
        this.throughOtherPlayer = true;
    }
}

const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer) {
        console.log(player.name)
        player.setComponentsTop(Components.text('{name}'))
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            player.callMainMenu()
        }

        if (input == Control.Action) {
            const event: any = player.getCurrentMap()?.createDynamicEvent({
                x: 100,
                y: 100,
                event: VillagerEvent,
            })

            const clear = (event: RpgEvent) => {
                event.stopMoveTo();
                event.showAnimation('female', 'stand');

                setTimeout(() => {
                    event.getCurrentMap()?.removeEvent(event.id);
                }, 200)
            }

            Object.entries(event).forEach(([eventId, event]) => {
                event.moveTo(player, {
                    onComplete: () => clear(event),
                }).subscribe();
            });
        }
    }
}

export default player