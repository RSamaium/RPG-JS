import { RpgPlayer } from '@rpgjs/server'
import { database } from '@rpgjs/starter-kit-server'

export class Player extends RpgPlayer {

    _rev

    async onConnected() {

      this.setHitbox(20, 16) 
      this.setGraphic('male1_2')
      this.setActor(database.Hero) 

     /* const gui = this.gui('gui-name')

      gui.on('change-name', (name) => {
           this.name = name
           gui.close()
      })

      await gui.open({}, {
          waitingAction: true,
          blockPlayerInput: true
      })
      */

       /*const data = await db.get('test')

       if (false) {
         this.load(data.data)
         this._rev = data._rev
       }
       else {
        
       }  */
       
        await this.changeMap('cave')

        
    }

    onJoinMap() {
      //const gui = this.gui('info')
      //gui.open({})
    }

    onInput({ input }) {
      if (input == 'back') {
        //this.callMainMenu()
        this.showEmotionBubble('confusion')
      }
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}