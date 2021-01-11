import { RpgSceneMap, RpgGui, SceneData } from '@rpgjs/client'

@SceneData({
    inputs: {
        'up': {
            repeat: true
        },
        'down': {
            repeat: true
        },
        'left': {
            repeat: true
        },
        'right': {
            repeat: true
        },
        'escape': {
            method: 'back'
        }
    }
})
export class SceneMap extends RpgSceneMap {
    onLoad() {
       
    }

    back() {
        console.log('ll')
    }
}