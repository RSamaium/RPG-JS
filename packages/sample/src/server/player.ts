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

        if (true) {
            const dump = `{"hp":741,"sp":534,"gold":0,"level":1,"exp":0,"name":"Hero","position":{"x":1048,"y":921,"z":0},"items":[{"item":"sword","nb":1},{"item":"shield","nb":1}],"_class":"fighter","equipments":["sword","shield"],"skills":[],"states":[],"effects":[],"graphic":"hero2","map":"medieval","speed":3,"canMove":true,"through":true,"width":32,"height":32,"wHitbox":20,"direction":3,"initialLevel":1,"finalLevel":99} `
            this.load(dump)
            return
        }

        this.through = true

        this.setGraphic('hero2')
        this.changeMap('medieval')

        this.setActor(database.Hero)
    }

    onInput({ input }) {
      if (input == 'space') {
          //this.addItem(database.Potion)
      }
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}