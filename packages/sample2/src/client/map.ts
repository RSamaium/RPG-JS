import { RpgSceneMap, RpgGui, SceneData, Control, Input, PrebuiltGui } from '@rpgjs/client'

export class SceneMap extends RpgSceneMap {
    onLoad() {
        if (this.viewport) {
            this.viewport.setZoom(2)
        }
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
                bind: [Input.Space]
            },
            [Control.Back]: {
                bind: Input.Escape
            },
            attack: {
                bind: Input.A,
            }
        })
    }
}