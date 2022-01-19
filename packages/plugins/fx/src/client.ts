import { RpgClient, RpgModule } from '@rpgjs/client'
import JSZip from 'jszip'
import {FX} from 'revolt-fx/dist/revoltfx'

const fx = new FX()
const zip = new JSZip()

@RpgModule<RpgClient>({ 
    engine: {
        async onStart() {
            const rfxBundleSettings = require('./assets/default-bundle.zip');
            await fx.loadBundleZip(rfxBundleSettings, zip);
        }
    },
    scenes: {
        map: {
            onDraw() {
                fx.update()
            },
            // test
            onAddSprite(scene, sprite) {
                setTimeout(() => {
                    const container = new PIXI.Container()
                    sprite.addChild(container)
                    const emitter = fx.getParticleEmitter('plasma-corona');
                    emitter.init(container);
                }, 3000 )
            }
        }
    }
})
export default class RpgClientEngine {}