import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { Sprite } from './player'
import hud from './gui/hud.vue'
import inn from './gui/inn.vue'
import name from './gui/name.vue'
import info from './gui/info.vue'
import { SceneMap } from './map'
import plugins from '../plugins'

@RpgClient({
    plugins,
    gui: [
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