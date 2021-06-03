import { RpgPlayer } from '@rpgjs/server'

export class Player extends RpgPlayer {

    _rev

    async onConnected() {

      
      this.setVision({
        type: 'box',
        width: 100,
        height: 100
      })

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
      

        
    }

    async onJoinMap(map) {
      const choice = await this.showChoices('What color do you prefer?', [
        { text: 'Black', value: 'black' },
        { text: 'Rather the blue', value: 'blue' },
        { text: 'I don\'t have a preference!', value: 'none' }
       ])
    }

    onInput({ input }) {
      if (input == 'back') {
        this.callMainMenu()
        //this.showEmotionBubble('confusion')
      }
    }

    onInShape(shape) {
      console.log('in', shape)
    }

    onOutShape(shape) {
      console.log('out', shape)
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}