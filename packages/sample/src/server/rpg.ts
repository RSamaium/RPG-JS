import { RpgServer, RpgServerEngine } from '@rpgjs/server'
import { maps } from '@rpgjs/starter-kit-server'
import { Player } from './player'

@RpgServer({
    basePath: __dirname,
    maps,
    playerClass: Player
})
export default class RPG extends RpgServerEngine {
    onStatus(nb) {
        console.log(`${nb} players connected`) 
    }
}