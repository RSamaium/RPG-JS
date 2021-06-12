import { RpgClient, RpgModule, RpgGui } from '@rpgjs/client'
import titleGui from './gui/title.vue'
import { sprite } from './sprite'

@RpgModule<RpgClient>({ 
    sprite,
    gui: [
        titleGui
    ],
    engine: {
        onStart() {
            RpgGui.display('rpg-title-screen')
            return false 
        },
        onConnected() {
           
        }
    }
})
export default class RpgClientEngine {}