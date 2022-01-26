import { Potion, Key } from './fixtures/item'
import {_beforeEach} from './beforeEach'

let  client, player, fixture, playerId, server

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
})

test('get current map', () => {
    const map = player.getCurrentMap()
    expect(map).toBeDefined()
})
