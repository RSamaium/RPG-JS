import { RpgPlayer } from '@rpgjs/server'
import { database } from '@rpgjs/starter-kit-server'

export class Player extends RpgPlayer {
    onConnected() {
        this.through = true
        this.setHitbox(20, 16)
        this.setGraphic('hero2')
        this.changeMap('medieval')
        this.setActor(database.Hero)
    }

    onInput({ input }) {
      if (input == 'space') {
        //this.changeMap('mapz')
          //this.addItem(database.Potion)
      }
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}