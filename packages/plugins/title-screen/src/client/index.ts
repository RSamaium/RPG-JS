import { RpgClient, RpgModule, RpgGui } from '@rpgjs/client'
import { sprite } from './sprite'

@RpgModule<RpgClient>({ 
    sprite,
    engine: {
        async onStart() {
            return false 
        },
        onConnected() {
            console.log('ll')
        }
    }
})
export default class RpgClientEngine {}