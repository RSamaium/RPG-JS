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
                
            }
        }
    }
})
export default class RpgClientModuleEngine {}