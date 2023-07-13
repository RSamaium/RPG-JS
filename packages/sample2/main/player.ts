import { RpgPlayerHooks, RpgPlayer, EventData, RpgEvent, Move, RpgWorld, Components, Presets } from '@rpgjs/server'

const rand = Math.random()

@EventData({
   name: 'EV-5'
})
class MyEvent extends RpgEvent {
   onInit() {
      this.setGraphic('male')
      this.setHitbox(32, 32)
      this.speed = 1
      this.setComponentsTop([
         Components.hpBar()
      ])
      this.addParameter(Presets.MAXHP, {
         start: 100,
         end: 200
      })
      this.recovery({ hp: 1 })
      console.log(this.param)
      //this.infiniteMoveRoute([ Move.tileRandom()])
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
   },
   onInput(player: RpgPlayer, { input }) {
      if (input == 'action') {
         const map = player.getCurrentMap()
         const event = map?.getEventByName('EV-5')
         if (event) event.hp -= 100
         const expToGive = 30;
         player.exp += expToGive;
         console.log('killed mob, exp for next level: ', player.expForNextlevel);
      }
   }
}

export default player