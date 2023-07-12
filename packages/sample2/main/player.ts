import { RpgPlayerHooks, RpgPlayer, EventData, RpgEvent, Move, RpgWorld } from '@rpgjs/server'

const rand = Math.random()

@EventData({
   name: 'EV-5'
})
class MyEvent extends RpgEvent {
   onInit() {
      this.setGraphic('male')
      this.setHitbox(32, 32)
   }
   onAction() {
      const map = this.getCurrentMap()
      map?.removeEvent(this.id)
   }
}

const player: RpgPlayerHooks = {
   onJoinMap(player: RpgPlayer) {
      const map = player.getCurrentMap()
      const events = map?.createDynamicEvent({
         x: 400,
         y: 400,
         event: MyEvent
      })
   }
}

export default player