import { RpgSceneMapHooks, RpgSceneMap, RpgGui } from '@rpgjs/client'

const sceneMap: RpgSceneMapHooks = {
    onAfterLoading(scene) {
        scene.on('click', (scene) => {
            console.log(scene)
        })
    },
}

export default sceneMap;