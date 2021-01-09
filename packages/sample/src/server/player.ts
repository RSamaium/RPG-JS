import { RpgPlayer } from '@rpgjs/server'
import { database } from '@rpgjs/starter-kit-server'
import { Db } from './db'

const db = new Db('db')

export class Player extends RpgPlayer {

    _rev

    async onConnected() {

       /*const data = await db.get('test')

       if (false) {
         this.load(data.data)
         this._rev = data._rev
       }
       else {
        
       }  */

       this.setHitbox(20, 16)
        this.setGraphic('male1_2')
        this.setActor(database.Hero)
        await this.changeMap('medieval') 
    }

    onInput({ input }) {
      if (input == 'escape') {
        /*this.gui('my-inn').open({
          amount: 30
        })*/

       // const data = this.getCurrentMap()

        //console.log(data)

       // this.callMainMenu()

        //db.save(this).catch(console.log)
      }
    }

    onDead() {
       
    }

    onLevelUp(nbLevel) {
        
    }
}