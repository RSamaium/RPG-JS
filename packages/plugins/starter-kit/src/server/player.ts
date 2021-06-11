import { RpgPlayer } from '@rpgjs/server'
import databaseList  from './database'

export const player = {
    onConnected(player: RpgPlayer) {
        player.setHitbox(20, 16) 
        player.setGraphic('male1_2')
        player.changeMap('medieval')
        player.setActor(databaseList.Hero) 
    }
}