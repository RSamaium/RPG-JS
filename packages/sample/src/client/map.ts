import { RpgSceneMap, RpgGui, SceneData, Control, Input } from '@rpgjs/client'
export class SceneMap extends RpgSceneMap {
    onLoad() {
        this.setInputs({
            [Control.Up]: {
                repeat: true,
                bind: Input.Up
            },
            [Control.Down]: {
                repeat: true,
                bind: Input.Down
            },
            [Control.Right]: {
                repeat: true,
                bind: Input.Right
            },
            [Control.Left]: {
                repeat: true,
                bind: Input.Left
            },
            [Control.Action]: {
                bind: [Input.M]
            },
            [Control.Back]: {
                bind: Input.Escape
            },
            anim: {
                bind: Input.A,
                method: this.anim
            }
        })
    }

    anim() {
        this.showAnimation({ 
            graphic: 'shield',
            animationName: 'default',
            attachTo: this.getCurrentPlayer()
        })
    }
}