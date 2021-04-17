import { RpgServer, RpgServerEngine } from '@rpgjs/server'
import { maps, database } from '@rpgjs/starter-kit-server'
import { Player } from './player'
import plugins from '../plugins'

@RpgServer({
    basePath: __dirname,
    plugins,
    maps,
    database,
    playerClass: Player
})
export default class RPG extends RpgServerEngine {
    onStatus(nb) {
        console.log(`${nb} players connected`) 
    }
} 