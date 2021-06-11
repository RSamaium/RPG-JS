import { RpgModule, RpgClient } from '@rpgjs/client'
import ControlGui from './controls/main.vue'
import { sceneMap } from './scene-map'

@RpgModule<RpgClient>({
    gui: [
        ControlGui
    ],
    scenes: {
        map: sceneMap
    }
})
export default class RpgClientEngine {}