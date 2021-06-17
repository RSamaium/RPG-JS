import { RpgClient, RpgModule } from '@rpgjs/client'
import { sprite } from './sprite'
import loadGui from './gui/load.vue'

@RpgModule<RpgClient>({ 
    sprite,
    gui: [
        loadGui
    ]
})
export default class RpgClientEngine {}