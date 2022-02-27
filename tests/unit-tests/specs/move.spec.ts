import { Move } from '@rpgjs/server'
import {_beforeEach} from './beforeEach'
import { clear } from '@rpgjs/testing'

let  client, player, fixture, playerId

const INITIAL_SPEED = 3

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
})

test('Default Speed', async () => {
    expect(player.speed).toBe(INITIAL_SPEED) // default speed
 })

test('Move Route', async () => {
   await player.moveRoutes([ Move.right() ])
   expect(player.position).toMatchObject({ x: INITIAL_SPEED, y: 0, z: 0 })
})


afterEach(() => {
    clear()
})