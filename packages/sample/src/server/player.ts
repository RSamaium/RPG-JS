import { RpgPlayer } from '@rpgjs/server'
import { database } from '@rpgjs/starter-kit-server'

export class Player extends RpgPlayer {
    onConnected() {

        function getRandomInt(max) {
            return Math.floor(Math.random() * Math.floor(max));
        }
       
        this.setSizes({
            width: 32,
            height: 32,
            hitbox: {
                width: 20,
                height: 16
            }
        })

        this.setGraphic('hero')
        this.changeMap('medieval')

        this.setActor(database.Hero)
    }

    onInput({ input }) {
      if (input == 'escape') {
          
      }
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}