import { RpgClient, RpgModule, Spritesheet, RpgSceneMap, RpgSprite, RpgClientEngine } from '@rpgjs/client'
import Characters from './characters'
import { MedievalTilesets } from './maps/medieval'
import { sprite } from './sprite'

let engine

@RpgModule<RpgClient>({ 
    spritesheets: [MedievalTilesets, ...Characters],
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