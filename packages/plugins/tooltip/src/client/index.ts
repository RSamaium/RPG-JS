import { HookClient, RpgGui } from '@rpgjs/client'
import tooltipGui from './gui/tooltip.vue'

export default ({ RpgPlugin }) => {
    const obj = {
        gui: [
            tooltipGui
        ]
    } 
    RpgPlugin.on(HookClient.AddGui, () => {
        return obj.gui
    })
    RpgPlugin.on(HookClient.AddSprite, (sprite) => {
        RpgGui.display('tooltip')
    })
}