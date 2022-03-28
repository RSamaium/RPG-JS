import { RpgWorld, RpgPlugin } from '@rpgjs/server'
import { HookClient } from '@rpgjs/client'
import { testing } from '@rpgjs/testing'
import modules from '../src/modules'

let  client, engine, player, fixture, playerId

beforeEach(async () => {
    fixture = testing(modules, {
        basePath: __dirname + '/../'
    })
    const clientFixture = await fixture.createClient()
    client = clientFixture.client
    playerId = clientFixture.playerId
    player = RpgWorld.getPlayer(playerId)
})


test('test player', () => {
   console.log(player)
})
