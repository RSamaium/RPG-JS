import { RpgPlayer } from '@rpgjs/server'
import { database } from '@rpgjs/starter-kit-server'

export class Player extends RpgPlayer {
    async onConnected() {
        this.through = true
        this.setHitbox(20, 16)
        this.setGraphic('male1_2')
        this.setActor(database.Hero)
        this.gold = 100000
        await this.changeMap('medieval')
    }

    onInput({ input }) {
      if (input == 'escape') {
        this.callMainMenu()
      }
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}