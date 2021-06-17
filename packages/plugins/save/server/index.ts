import { RpgServer, RpgModule } from '@rpgjs/server'
import { player } from './player'

@RpgModule<RpgServer>({ 
    player,
    engine: {
        onStart(server) {
            
        }
    }
})
export default class RpgServerEngine {}