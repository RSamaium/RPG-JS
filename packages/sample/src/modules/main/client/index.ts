import { RpgClient, RpgModule, Spritesheet, RpgSceneMap, RpgSprite, RpgClientEngine, RpgGui } from '@rpgjs/client'
import Characters from './characters'
import { MedievalTilesets } from './maps/medieval'
import { sprite } from './sprite'
import hpGui from './gui/hp.vue'
import myTooltip from './gui/tooltip.vue'
import { Musics } from './sounds'

let engine

@RpgModule<RpgClient>({ 
    spritesheets: [MedievalTilesets, ...Characters],
    sprite,
    engine: {
        onConnected(rpgEngine: RpgClientEngine, socket: any) {
            engine = rpgEngine
            RpgGui.display('my-tooltip')
        }
    },
    scenes: {
        map: {
            onAfterLoading(scene: RpgSceneMap) {
                
            }
        }
    },
    gui: [
        hpGui,
        myTooltip
    ],
    sounds: [
        Musics
    ]
})
export default class RpgClientModuleEngine {} 