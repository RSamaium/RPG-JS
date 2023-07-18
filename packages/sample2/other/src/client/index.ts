import { RpgClient, RpgModule, RpgClientEngine } from '@rpgjs/client'

@RpgModule<RpgClient>({ 
    engine: {
        onStart(rpgEngine: RpgClientEngine) {
           console.log('ok')
        }
    }
})
export default class RpgClientModuleEngine {}