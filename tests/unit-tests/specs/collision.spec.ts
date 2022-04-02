import { EventData, Move, RpgEvent, RpgMap, RpgPlayer } from '@rpgjs/server'
import {_beforeEach} from './beforeEach'
import { clear, nextTick } from '@rpgjs/testing'

let client, player: RpgPlayer, fixture, playerId

const TILE_SIZE = 32

@EventData({
    name: 'test',
    hitbox: {
        width: TILE_SIZE,
        height: TILE_SIZE
    }
})
class MyEvent extends RpgEvent {}

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId

    const map = player.getCurrentMap() as RpgMap
    map.createDynamicEvent({
        x: 0,
        y: 0,
        event: MyEvent
    })
})

test('Get Events collision (otherPlayersCollision property)', async () => {
    await player.moveRoutes([ Move.right() ])
    expect(player.otherPlayersCollision).toHaveLength(1)
    expect(player.otherPlayersCollision[0]).toBeInstanceOf(MyEvent)
})

test('Get Tile collision (tilesCollision property)', async () => {
    player.teleport({ x: 4 * TILE_SIZE, y: 4 * TILE_SIZE })
    await player.moveRoutes([ Move.right() ])
    expect(player.tilesCollision).toHaveLength(1)
    expect(player.tilesCollision[0].tileIndex).toBe(44)
    expect(player.tilesCollision[0].tiles).toHaveLength(2)
})

afterEach(() => {
    clear()
})