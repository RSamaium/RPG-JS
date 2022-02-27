import { RpgClient, RpgModule, Spritesheet, RpgSceneMap, RpgSprite, RpgClientEngine } from '@rpgjs/client'
import Characters from './characters'
import { MedievalTilesets } from './maps/medieval'
import { sprite } from './sprite'
import hpGui from './gui/hp.vue'

let engine

@RpgModule<RpgClient>({ 
    spritesheets: [MedievalTilesets, ...Characters],
    sprite,
    engine: {
        onConnected(rpgEngine: RpgClientEngine, socket: any) {
            engine = rpgEngine
        }
    },
    scenes: {
        map: {
            onAfterLoading(scene: RpgSceneMap) {
                let mousedown = false
                
            }
        }
    },
    gui: [
        hpGui
    ]
})
export default class RpgClientModuleEngine {}