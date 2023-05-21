import { RpgPlayerHooks, RpgPlayer, EventData, RpgEvent, Move } from '@rpgjs/server'

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
   async onInput(player: RpgPlayer, { input }) {
      player.callMainMenu()
   }
}

export default player 