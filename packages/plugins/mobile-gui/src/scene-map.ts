import { RpgGui, PrebuiltGui, RpgSceneMap, RpgSprite, RpgSceneMapHooks } from '@rpgjs/client'

export const sceneMap: RpgSceneMapHooks = {
    onAfterLoading() { 
        RpgGui.display(PrebuiltGui.Controls) 
    }
}