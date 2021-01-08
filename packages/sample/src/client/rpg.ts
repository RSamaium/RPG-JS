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
    spriteClass: Sprite,
    canvas: {
        fullScreen: true

    },
})
export default class RPG extends RpgClientEngine {

}