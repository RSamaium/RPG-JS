import { EventData, Move, RpgEvent, RpgMap, RpgPlayer } from '@rpgjs/server'
import { Hit } from '@rpgjs/common'
import {_beforeEach} from './beforeEach'
import { clear, nextTick } from '@rpgjs/testing'
import { box, circle, polygon } from './fixtures/shape'

let client, player: RpgPlayer, fixture, playerId
let event, map: RpgMap

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

    map = player.getCurrentMap() as RpgMap
    event = Object.values(map.createDynamicEvent({
        x: 0,
        y: 0,
        event: MyEvent
    }))[0]
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
    expect(player.tilesCollision[0].tiles).toHaveLength(1)
})

test('Tile collision (position not changed)', async () => {
    player.teleport({ x: 4 * TILE_SIZE, y: 4 * TILE_SIZE })
    expect(player.position.x).toBe(4 * TILE_SIZE)
    await player.moveRoutes([ Move.right() ])
    expect(player.position.x).toBe(4 * TILE_SIZE)
})

test('Test Collision with event (position not changed)', async () => {
    await player.moveRoutes([ Move.right() ])
    expect(player.position.x).toBe(0)
})

test('Test Collision with event (position changed because through property)', async () => {
    event.through = true
    await player.moveRoutes([ Move.right() ])
    expect(player.position.x).not.toBe(0)
})

test('Test Collision with shape (position not changed)', async () => {
    map.createShape({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        properties: {
            collision: true
        }
    })
    await player.moveRoutes([ Move.right() ])
    expect(player.position.x).toBe(0)
})

describe('Hit tests', () => {
    test('Create Hitbox', () => {
        const hitbox = Hit.createObjectHitbox(0, 0, 0, 100, 100)
        expect(hitbox.pos).toMatchObject({ x: 0, y: 0 })
        expect(hitbox.w).toBe(100)
        expect(hitbox.h).toBe(100)
    })

    test('Get Hitbox (box)', () => {
        const hitbox = Hit.getHitbox(box)
        expect(hitbox.type).toBe('box')
    })

    test('Get Hitbox (circle)', () => {
        const hitbox = Hit.getHitbox(circle)
        expect(hitbox.hitbox.r).toBe(50)
        expect(hitbox.type).toBe('circle')
    })

    test('Get Hitbox (polygon)', () => {
        const hitbox = Hit.getHitbox(polygon)
        expect(hitbox.type).toBe('polygon')
    })

    test('Test hit1 U hit2 (box/box)', () => {
        const hit1 = Hit.getHitbox(box)
        const hit2 = Hit.getHitbox(box)
        const ret = Hit.testPolyCollision('box', hit1.hitbox, hit2.hitbox)
        expect(ret).toBeTruthy()
    })

    test('Test hit1 U hit2 (box/circle)', () => {
        const hit1 = Hit.getHitbox(box)
        const hit2 = Hit.getHitbox(circle)
        const ret = Hit.testPolyCollision('circle', hit1.hitbox, hit2.hitbox)
        expect(ret).toBeTruthy()
    })

    test('Test hit1 U hit2 (polygon/box)', () => {
        const hit1 = Hit.getHitbox(box)
        const hit2 = Hit.getHitbox(polygon)
        const ret = Hit.testPolyCollision('polygon', hit2.hitbox, hit1.hitbox)
        expect(ret).toBeTruthy()
    })
})

afterEach(() => {
    clear()
})