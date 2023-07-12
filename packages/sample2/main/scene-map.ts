import { RpgSceneMapHooks, RpgSceneMap } from '@rpgjs/client'

const sceneMap: RpgSceneMapHooks = {
    onAfterLoading(scene: RpgSceneMap) {
        console.log('loaded scene');
    }
}

export default sceneMap;