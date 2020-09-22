import { RpgServer, RpgServerEngine, RpgPlayer, Query } from '../server'
import bootstrap from '../src/server/bootstrap';
import { clientIo, serverIo } from '../src/common/mock/io';

let engine

class Player extends RpgPlayer {
   onConnected() {
     
   }
}

@RpgServer({
   playerClass: Player
})
class RPGServer extends RpgServerEngine {
    onStart() {
       console.log('test')
    }
}

beforeAll(() => { 
   engine = bootstrap(RPGServer, serverIo).start()
   clientIo.connection()
})

test('adds 1 + 2 to equal 3', () => {
   //expect(engine.maps.length).toBe(0);
   const players = Query.find()
   console.log(players)
})