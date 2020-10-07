import { RpgPlayer } from '@rpgjs/server'
import { Item } from '@rpgjs/database'
import { database } from '@rpgjs/starter-kit-server'

@Item({
    name: 'A'
})
class A {}

@Item({
    name: 'B'
})
class B {}

@Item({
    name: 'C'
})
class C {}

@Item({
    name: 'D'
})
class D {}

export class Player extends RpgPlayer {
    onConnected() {

        function getRandomInt(max) {
            return Math.floor(Math.random() * Math.floor(max));
        }
        
        this.setGraphic('hero')
        this.changeMap('medieval', {
            x: getRandomInt(50 * 32),
            y: getRandomInt(50 * 32) 
        })

        this.setActor(database.Hero)
    }

    onInput({ input }) {
      if (input == 'escape') {
         /* this.addItem(database.Potion, 10)
          this.addItem(database.Key)
          this.addItem(A)
          this.addItem(B)
          this.addItem(C)
          this.addItem(D)*/
          this.level += 1
          this.callMainMenu()
      }
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}