import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { spritesheets, sounds } from '@rpgjs/starter-kit-client'
import gui from '@rpgjs/default-gui'
import Stats from 'stats.js'
import { Sprite } from './player'
import hud from './gui/hud.vue'
import inn from './gui/inn.vue'

@RpgClient({
    spritesheets,
    sounds,
    gui: [
       ...gui,
       hud,
       inn
    ],
    spriteClass: Sprite
})
export default class RPG extends RpgClientEngine {

   stats

   onLatency(latency) {
      // console.log(latency)  
   } 

   async start() {
      
      super.start()
      this.stats = new Stats()
      document.body.appendChild( this.stats.dom )
   }

   step(t, dt) {
      this.stats.begin()
      super.step(t, dt)
      this.stats.end()
   }
}