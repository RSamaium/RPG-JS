import { RpgSceneMapHooks, RpgSceneMap, RpgGui } from '@rpgjs/client'

const sceneMap: RpgSceneMapHooks = {
    onAfterLoading(scene: RpgSceneMap) {
        RpgGui.display('tooltip')
        scene.viewport?.setZoom(1.5)
    }
}

export default sceneMap;