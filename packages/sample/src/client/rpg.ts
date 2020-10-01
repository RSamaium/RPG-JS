import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { spritesheets } from '@rpgjs/starter-kit-client'
import gui from '@rpgjs/default-gui'
import { Player } from './player'
import { Event } from './event'

@RpgClient({
    spritesheets,
    gui,
    playerClass: Player,
    eventClass: Event
})
export default class RPG extends RpgClientEngine {
   onLatency(latency) {
       console.log(latency) 
   } 
}