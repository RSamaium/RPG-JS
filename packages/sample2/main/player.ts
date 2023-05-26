import { RpgPlayerHooks, RpgPlayer, EventData, RpgEvent, Move, RpgWorld } from '@rpgjs/server'

const rand = Math.random()

@EventData({
   name: 'EV-1'
  })
  class MyEvent extends RpgEvent {
   onAction() {
       
   }
  } 
  

const player: RpgPlayerHooks = {
   onJoinMap(player: RpgPlayer) {
     const map = player.getCurrentMap()
     map?.createDynamicEvent({
         x: 100,
         y: 100,
         event: MyEvent
      })
   },
   onInput(player: RpgPlayer) {
      //const event = player.getCurrentMap()?.getEventByName('EV-1')
      console.log(rand)
   }
}

export default player