import { RpgClient, RpgModule, Spritesheet, RpgSceneMap, RpgSprite, RpgClientEngine } from '@rpgjs/client'
import { sprite } from './sprite'

let engine

@RpgModule<RpgClient>({ 
    sprite,
    engine: {
        onConnected(rpgEngine: RpgClientEngine) {
            engine = rpgEngine
        }
    },
    scenes: {
        map: {
            onAfterLoading(scene: RpgSceneMap) {
                let mousedown = false
                scene.tilemap.addEventListener('pointerdown', (pos) => {
                    mousedown = true
                    engine.socket.emit('change-tile', pos)
                })
                scene.tilemap.addEventListener('pointerup', (pos) => {
                    mousedown = false
                })
                scene.tilemap.addEventListener('pointermove', (pos) => {
                    if (mousedown) engine.socket.emit('change-tile', pos)
                })
            }
        }
    }
})
export default class RpgClientModuleEngine {}