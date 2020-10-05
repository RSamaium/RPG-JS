import { Query, Presets } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'
import { RPGServer } from './fixtures/server'

let  client, socket, player
const { MAXHP_CURVE, MAXSP_CURVE } = Presets

beforeEach(() => {
    const fixture = testing(RPGServer)
    client = fixture.createClient()
    socket = client.connection()
    player = new Query().getPlayer(client)
})

test('Test HP', () => {
   expect(player.hp).toBe(MAXHP_CURVE.start)
})

test('Test SP', () => {
   expect(player.sp).toBe(MAXSP_CURVE.start)
})