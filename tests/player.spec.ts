import { RpgServer, RpgServerEngine, RpgPlayer, entryPoint } from '../server'
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
   engine = entryPoint(RPGServer, serverIo)
   engine.start()
   clientIo.connection()
})

test('', () => {
   console.log(engine)
})