import { EventData, Move, RpgEvent, RpgMap, RpgPlayer, RpgShape, RpgServerEngine } from '@rpgjs/server'
import { Hit } from '@rpgjs/common'
import { _beforeEach } from './beforeEach'
import { clear, nextTick, waitUntil } from '@rpgjs/testing'
import { box, circle, polygon } from './fixtures/shape'
import { beforeEach, test, afterEach, expect, describe, vi } from 'vitest'

let client, player: RpgPlayer, fixture, playerId
let event, map: RpgMap
let server: RpgServerEngine

const TILE_SIZE = 32

@EventData({
    name: 'test',
    hitbox: {
        width: TILE_SIZE,
        height: TILE_SIZE
    }
})
class MyEvent extends RpgEvent { }

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
    server = ret.server
    map = player.getCurrentMap() as RpgMap
})

describe('Collision with Event', () => {
    beforeEach(() => {
        event = Object.values(map.createDynamicEvent({
            x: 0,
            y: 0,
            event: MyEvent
        }))[0]
    })

    test('Get Events collision (otherPlayersCollision property)', async () => {
        await waitUntil(
            player.moveRoutes([Move.right()])
        )
        expect(player.otherPlayersCollision).toHaveLength(1)
        expect(player.otherPlayersCollision[0]).toBeInstanceOf(MyEvent)
    })

    test('Get Tile collision (tilesCollision property)', async () => {
        player.teleport({ x: 4 * TILE_SIZE, y: 4 * TILE_SIZE })
        await waitUntil(
            player.moveRoutes([Move.right()])
        )
        expect(player.tilesCollision).toHaveLength(1)
        expect(player.tilesCollision[0].tileIndex).toBe(44)
        expect(player.tilesCollision[0].tiles).toHaveLength(1)
    })

    test('Tile collision (position not changed)', async () => {
        player.teleport({ x: 4 * TILE_SIZE, y: 4 * TILE_SIZE })
        expect(player.position.x).toBe(4 * TILE_SIZE)
        await waitUntil(
            player.moveRoutes([Move.right()])
        )
        expect(player.position.x).toBe(4 * TILE_SIZE)
    })

    test('Test Collision with event (position not changed)', async () => {
        await waitUntil(
            player.moveRoutes([Move.right()])
        )
        expect(player.position.x).toBe(0)
    })

    test('Test Collision with event (position changed because through property)', async () => {
        event.through = true
        await waitUntil(
            player.moveRoutes([Move.right()])
        )
        expect(player.position.x).not.toBe(0)
    })
})

describe('Collision with Shape', () => {
    let spy

    beforeEach(() => {
        spy = vi.spyOn(map.gridShapes, 'insertInCells')
        map.createShape({
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: {
                collision: true
            },
            name: 'test'
        })
    })

    test('Shape is inserted in virtual grid', async () => {
        expect(spy).toHaveBeenCalled()
        expect(spy).toHaveBeenCalledWith('test', {
            minX: 0 - map.tilewidth,
            maxX: 100 + map.tilewidth,
            minY: 0 - map.tilewidth,
            maxY: 100 + map.tilewidth
        })
    })

    test('Test Collision with shape (position not changed)', async () => {
        await waitUntil(
            player.moveRoutes([Move.right()])
        )
        expect(player.position.x).toBe(0)
    })

    test('Test Collision with shape (shapesCollision.length > 0) ', async () => {
        await waitUntil(
            player.moveRoutes([Move.right()])
        )
        expect(player.shapesCollision).toHaveLength(1)
        expect(player.shapesCollision[0]).toBeInstanceOf(RpgShape)
    })
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

describe('Test Moving Hitbox: createMovingHitbox()', () => {
    test('Create', () => {
        return new Promise((resolve: any) => {
            map.createMovingHitbox([
                { x: 0, y: 0, width: 100, height: 100 }
            ]).subscribe((hitbox) => {
                expect(hitbox).toHaveProperty('id')
                expect(hitbox).toHaveProperty('map', 'map')
                const { pos, w, h } = hitbox.hitbox
                expect(pos.x).toBe(0)
                expect(pos.y).toBe(0)
                expect(w).toBe(100)
                expect(h).toBe(100)
                resolve()
            })
        })
    })

    test('Collision with player', () => {
        return new Promise((resolve: any) => {
            map.createMovingHitbox([
                { x: 0, y: 0, width: 100, height: 100 }
            ]).subscribe((hitbox) => {
                expect(hitbox.otherPlayersCollision).toHaveLength(1)
                expect(hitbox.otherPlayersCollision[0]).toBeInstanceOf(RpgPlayer)
                resolve()
            })
        })
    })

    test('multi hitboxes', () => {
        return new Promise((resolve: any) => {
            let i = 0
            map.createMovingHitbox([
                { x: 0, y: 0, width: 100, height: 100 },
                { x: 20, y: 20, width: 100, height: 100 }
            ]).subscribe({
                next() {
                    i++
                    server.nextTick(i)
                },
                complete() {
                    expect(i).toBe(2)
                    resolve()
                }
            })
        })
    })

    test('multi hitboxes, speed = 3 frames', () => {
        return new Promise((resolve: any) => {
            let i = 0
            map.createMovingHitbox([
                { x: 0, y: 0, width: 100, height: 100 },
                { x: 20, y: 20, width: 100, height: 100 }
            ], {
                speed: 3
            }).subscribe({
                next() {
                    i++
                },
                complete() {
                    expect(i).toBe(2)
                    resolve()
                }
            })
            for (let i = 0; i <= 9; i++) {
                server.nextTick(i)
            }
        })
    })
})

afterEach(() => {
    clear()
})