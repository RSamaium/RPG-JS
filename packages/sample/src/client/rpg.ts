import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { spritesheets, sounds } from '@rpgjs/starter-kit-client'
import gui from '@rpgjs/default-gui'
import Stats from 'stats.js'
import { Sprite } from './player'
import hud from './gui/hud.vue'
import inn from './gui/inn.vue'
import name from './gui/name.vue'
import { SceneMap } from './map'

@RpgClient({
    spritesheets,
    sounds,
    gui: [
       ...gui,
       hud,
       inn,
       name
    ],
    spriteClass: Sprite,
    scenes: {
        map: SceneMap
    }
})
export default class RPG extends RpgClientEngine {
}