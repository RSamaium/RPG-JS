import { Query } from '@rpgjs/server'
import { RPGServer } from './fixtures/server'
import { testing } from '@rpgjs/testing'

let  client, socket

beforeAll(() => { 
   const fixture = testing(RPGServer)
   client = fixture.createClient()
   socket = client.connection()
})

test('', () => {
   //const player = new Query().getPlayer(client)
   //expect(player.level).toBe(1)
})