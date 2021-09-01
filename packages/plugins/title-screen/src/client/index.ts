import { RpgClient, RpgModule, RpgGui } from '@rpgjs/client'
import titleGui from './gui/title.vue'
import loginGui from './gui/connect.vue'
import { sprite } from './sprite'

@RpgModule<RpgClient>({ 
    sprite,
    gui: [
        titleGui,
        loginGui
    ]
})
export default class RpgClientEngine {}