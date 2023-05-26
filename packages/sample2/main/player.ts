import { RpgPlayerHooks, RpgPlayer, EventData, RpgEvent, Move, RpgWorld } from '@rpgjs/server'

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
     
   }
}

export default player 