import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { spritesheets, sounds } from '@rpgjs/starter-kit-client'
import gui from '@rpgjs/default-gui'
import { Sprite } from './player'

@RpgClient({
    spritesheets,
    sounds,
    gui,
    spriteClass: Sprite
})
export default class RPG extends RpgClientEngine {
   onLatency(latency) {
      // console.log(latency)  
   } 
}