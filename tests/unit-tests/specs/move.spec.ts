import { Move, ShapePositioning, Direction } from '@rpgjs/server'
import {_beforeEach} from './beforeEach'
import { clear, nextTick } from '@rpgjs/testing'

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

test('Repeat Move Route', async () => {
    await player.moveRoutes([ Move.repeatMove(Direction.Right, 2) ])
    expect(player.position).toMatchObject({ x: INITIAL_SPEED * 2, y: 0, z: 0 })
})

test('Repeat Tile Move Route', async () => {
    await player.moveRoutes([ Move.tileRight(2) ])
    expect(player.position).toMatchObject({ x: 60, y: 0, z: 0 })
})

test('Move but limit of the map', async () => {
    player.position.x = 1
    await player.moveRoutes([ Move.left() ])
    expect(player.position).toMatchObject({ x: 0, y: 0, z: 0 })
    nextTick(client)
    const logic = client.gameEngine.world.getObject(playerId)
    expect(logic.position).toMatchObject({ x: 0, y: 0, z: 0 })
})

describe('Size Max Shape of Player', () => {
    test('(default)', async () => {
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 0, minY: 0, maxX: 32, maxY: 32 })
    })

    test('(hitbox)', async () => {
        player.setHitbox(100, 100)
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 0, minY: 0, maxX: 100, maxY: 100 })
    })

    test('(hitbox) + (position)', async () => {
        player.setHitbox(100, 100)
        player.position.x = 50
        player.position.y = 50
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 50, minY: 50, maxX: 150, maxY: 150 })
    })

    test('(attach shape)', async () => {
        player.position.x = 200
        player.position.y = 200
        player.setHitbox(10, 10)
        player.attachShape({
            width: 100,
            height: 100,
            positioning: ShapePositioning.Center
        })
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 155, minY: 155, maxX: 255, maxY: 255 })
    })

    test('(multi attach shape)', async () => {
        player.position.x = 200
        player.position.y = 200
        player.setHitbox(10, 10)
        player.attachShape({
            width: 100,
            height: 100,
            positioning: ShapePositioning.Center
        })
        player.attachShape({
            width: 50,
            height: 200,
            positioning: ShapePositioning.Center
        })
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 155, minY: 105, maxX: 255, maxY: 305 })
    })
})
 
afterEach(() => {
    clear()
})