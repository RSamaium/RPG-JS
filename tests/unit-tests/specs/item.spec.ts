import { Query } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'
import { Potion } from './fixtures/item'
import { RPGServer } from './fixtures/server'

let  client, socket, player

beforeEach(() => {
    const fixture = testing(RPGServer)
    client = fixture.createClient()
    socket = client.connection()
    player = new Query().getPlayer(client)
})

test('use an object that is not in the inventory', () => {
    const ret = player.useItem(Potion)
    expect(ret.id).toBe('ITEM_NOT_INVENTORY')
})