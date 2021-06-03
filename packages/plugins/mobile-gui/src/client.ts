import { HookClient, PrebuiltGui, RpgGui } from '@rpgjs/client'
import ControlGui from './controls/main.vue'

export default function({ RpgPlugin }) {
    RpgPlugin.on(HookClient.AddGui, () => {
        return [
           ControlGui
        ]
    })
    RpgPlugin.on(HookClient.AfterSceneLoading, () => {
        RpgGui.display(PrebuiltGui.Controls) 
    })
}