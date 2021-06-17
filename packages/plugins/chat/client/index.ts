import { RpgClient, RpgModule } from '@rpgjs/client'
import { sprite } from './sprite'
import chatGui from './gui/chat.vue'
import { sceneMap } from './map'

@RpgModule<RpgClient>({ 
    sprite,
    scenes: {
        map: sceneMap
    },
    gui: [
        chatGui
    ]
})
export default class RpgClientEngine {}