import { RpgClient, RpgModule, Spritesheet, RpgSceneMap, RpgSprite, RpgClientEngine, RpgGui } from '@rpgjs/client'
import Characters from './characters'
import { sprite } from './sprite'
import hpGui from './gui/hp.vue'
import myTooltip from './gui/tooltip.vue'
import { Musics } from './sounds'
import { ShieldAnimations } from './animation'

let engine

@RpgModule<RpgClient>({ 
    spritesheets: [...Characters, ShieldAnimations],
    sprite,
    engine: {
        onConnected(rpgEngine: RpgClientEngine, socket: any) {
            engine = rpgEngine
        }
    },
    scenes: {
        map: {
            onAfterLoading(scene: RpgSceneMap) {
                scene.on('pointerdown', (pos) => {
                    console.log(pos)
                })
            }
        }
    },
    gui: [
        hpGui,
        myTooltip
    ],
    sounds: [
       // Musics
    ]
})
export default class RpgClientModuleEngine {}