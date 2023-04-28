import { RpgPlayerHooks, RpgPlayer, EventData, RpgEvent } from '@rpgjs/server'

@EventData({
   name: 'EV-1'
  })
  class MyEvent extends RpgEvent {
   onAction() {
       console.log('ok')
   }
  } 
  

const player: RpgPlayerHooks = {
   onJoinMap(player: RpgPlayer) {
     const map = player.getCurrentMap()
     map.createDynamicEvent({
         x: 100,
         y: 100,
         event: MyEvent
      })
     
   },
   onInput(player: RpgPlayer) {
      const map = player.getCurrentMap()
      console.log(map.events)
   }
}

export default player 