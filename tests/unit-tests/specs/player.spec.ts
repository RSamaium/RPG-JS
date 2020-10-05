import { RpgServer, RpgServerEngine, RpgPlayer, Query } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'

let  client, socket

class Player extends RpgPlayer {
   onConnected() {
     
   }
}

@RpgServer({
   playerClass: Player,
   basePath: __dirname
})
class RPGServer extends RpgServerEngine {
    onStart() {
       console.log('test')
    }
}

beforeAll(() => { 
   const fixture = testing(RPGServer)
   client = fixture.createClient()
   socket = client.connection()
})

test('', () => {
   const player = new Query().getPlayer(client)
   expect(player.level).toBe(1)
})