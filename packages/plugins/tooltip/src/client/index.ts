import { HookClient, RpgClient, RpgGui, RpgModule, RpgSprite } from '@rpgjs/client'
import tooltipGui from './gui/tooltip.vue'

@RpgModule<RpgClient>({ 
    gui: [
        tooltipGui
    ],
    sprite: {
        onInit(sprite: RpgSprite) {
            sprite.interactive = true
            sprite.on('click', () => {
                sprite.guiDisplay = true
            }) 
        }
    },
    scenes: {
        map: {
            onAfterLoading() {
               RpgGui.display('rpg-tooltip')
            }
        }
    }
})
export default class RpgClientModuleEngine {}