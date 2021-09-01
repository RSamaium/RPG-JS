import { RpgClient, RpgModule } from '@rpgjs/client'
import { sprite } from './sprite'
import loadGui from './gui/load.vue'
import saveGui from './gui/save.vue'

@RpgModule<RpgClient>({ 
    sprite,
    gui: [
        loadGui,
        saveGui
    ]
})
export default class RpgClientEngine {}