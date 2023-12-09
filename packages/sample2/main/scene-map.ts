import { RpgSceneMapHooks, RpgSceneMap, RpgGui } from '@rpgjs/client'

const sceneMap: RpgSceneMapHooks = {
    onAfterLoading(scene) {
        scene.on('click', (ev) => {
            console.log('scene', ev)
        })
    },
}

export default sceneMap;