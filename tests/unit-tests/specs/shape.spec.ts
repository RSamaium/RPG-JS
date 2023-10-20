import { _beforeEach } from './beforeEach'
import { HookClient, RpgMap, RpgPlayer, RpgServerEngine, ShapePositioning, RpgShape, RpgServer, RpgModule, Move, MapData, EventData, RpgEvent } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, RpgPlugin, Control } from '@rpgjs/client'
import { clear, nextTick, waitUntil } from '@rpgjs/testing'
import { inputs } from './fixtures/control'
import { box, circle, polygon } from './fixtures/shape'
import { beforeEach, test, afterEach, expect, describe } from 'vitest'

let client: RpgClientEngine,
    player: RpgPlayer,
    fixture,
    playerId,
    server: RpgServerEngine,
    map: RpgMap,
    side: string

const TILE_SIZE = 32
const LAYER_NAME = 'Tile Layer 1'

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
    map = player.getCurrentMap() as RpgMap
})

test('Create Shape', () => {
    return new Promise((resolve: any) => {
        const shape = map.createShape({
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            name: 'test'
        })
        expect(shape.type).toEqual('box')
        expect(shape.name).toBeDefined()

        const mapShape = map.getShape('test')
        expect(mapShape).toBeDefined()

        RpgPlugin.on(HookClient.SceneOnChanges, (scene) => {
            const mapShape = scene.getShape('test')
            expect(mapShape).toBeDefined()
            expect(mapShape.x).toEqual(0)
            expect(mapShape.y).toEqual(0)
            resolve()
        })
        nextTick(client)
    })
})

test('Create Shape (circle)', () => {
    const shape = map.createShape(circle)
    expect(shape.type).toEqual('circle')
    expect(shape.name).toBeDefined()
    expect(shape.hitbox.pos.x).toBe(circle.width / 2)
    expect(shape.hitbox.pos.y).toBe(circle.width / 2)
})

test('Create Shape (polygon)', () => {
    const shape = map.createShape(polygon)
    expect(shape.type).toEqual('polygon')
    expect(shape.name).toBeDefined()
    expect(shape.hitbox.edges).toBeDefined()
})

describe('Shape - Event', () => {
    test('Shape In -Hook', () => {
        return new Promise(async (resolve: any) => {
            const shape = map.createShape(box)

            @EventData({
                name: 'EV-1'
            })
            class MyEvent extends RpgEvent {
                onInShape(_shape) {
                    expect(_shape.id).toBe(shape.id)
                    resolve()
                }
            }
            map.createDynamicEvent({
                x: 50,
                y: 50,
                event: MyEvent
            })
            const event = map.getEventByName('EV-1') as RpgEvent
            await event.moveRoutes([Move.right()])
        })
    })

    test('Detect Other Player (onDetectInShape Hook)', () => {
        return new Promise(async (resolve: any) => {
            let shape
            @EventData({
                name: 'EV-1'
            })
            class MyEvent extends RpgEvent {
                onInit() {
                    shape = this.attachShape({
                        height: 100,
                        width: 100,
                        positioning: ShapePositioning.Center
                    })
                }
                onDetectInShape(_player, _shape) {
                    expect(_player.id).toBe(player.id)
                    expect(_shape.id).toBe(shape.id)
                    resolve()
                }
            }
            map.createDynamicEvent({
                x: 50,
                y: 50,
                event: MyEvent
            })
            player.teleport({ x: 50, y: 50 })
        })
    })

    test('UnDetect Other Player (onDetectOutShape Hook)', () => {
        return new Promise(async (resolve: any) => {
            let shape
            @EventData({
                name: 'EV-1'
            })
            class MyEvent extends RpgEvent {
                onInit() {
                    shape = this.attachShape({
                        height: 100,
                        width: 100,
                        positioning: ShapePositioning.Center
                    })
                }
                onDetectOutShape(_player, _shape) {
                    expect(_player.id).toBe(player.id)
                    expect(_shape.id).toBe(shape.id)
                    resolve()
                }
            }
            map.createDynamicEvent({
                x: 50,
                y: 50,
                event: MyEvent
            })
            await player.teleport({ x: 50, y: 50 })
            player.teleport({ x: 200, y: 0 }) 
        })
    })
})


describe('Shape In - Hook', () => {
    function onInShape(shape, position = { x: 50, y: 50 }): Promise<{
        shape: RpgShape,
        player: RpgPlayer
    }> {
        return new Promise(async (resolve: any) => {
            clear()

            @RpgModule<RpgServer>({
                player: {
                    onInShape(player: RpgPlayer, shape: RpgShape) {
                        expect(player.id).toBeDefined()
                        expect(shape.name).toBeDefined()
                        resolve({ shape, player })
                    }
                }
            })
            class RpgServerModule { }

            const { player } = await _beforeEach([{
                server: RpgServerModule
            }])
            map = player.getCurrentMap()
            map.createShape(shape)
            player.teleport(position)
        })
    }

    test('Box', async () => {
        const { shape } = await onInShape(box)
        expect(shape.type).toBe('box')
    })

    test('Circle', async () => {
        const { shape } = await onInShape(circle)
        expect(shape.type).toBe('circle')
    })

    test('Polygon', async () => {
        const { shape } = await onInShape(polygon)
        expect(shape.type).toBe('polygon')
    })

    test('Test Z Position', async () => {
        const { player } = await onInShape(box)
        player.position.z = 10
        await waitUntil(
            player.moveRoutes([Move.left()])
        )
        expect(player.position.z).toBe(10)
    })
})

// TODO: If you teleport the player far away, he won't detect if you leave a shape because you're no longer in the same region (virtual grid).
describe('Shape Out - Hook', () => {
    function onOutShape(shape, position = { x: 50, y: 50 }): Promise<{
        shape: RpgShape,
        player: RpgPlayer
    }> {
        return new Promise(async (resolve: any) => {
            clear()

            @RpgModule<RpgServer>({
                player: {
                    onOutShape(player: RpgPlayer, shape: RpgShape) {
                        expect(player.id).toBeDefined()
                        expect(shape.name).toBeDefined()
                        resolve({ shape, player })
                    }
                }
            })
            class RpgServerModule { }

            const { player } = await _beforeEach([{
                server: RpgServerModule
            }])
            map = player.getCurrentMap()
            map.createShape(shape)
            await player.teleport(position)
            player.teleport({ x: 240, y: 0 })
        })
    }

    test('Box', async () => {
        const { shape } = await onOutShape(box)
        expect(shape.type).toBe('box')
    })

    test('Circle', async () => {
        const { shape } = await onOutShape(circle)
        expect(shape.type).toBe('circle')
    })

    test('Polygon', async () => {
        const { shape } = await onOutShape(polygon)
        expect(shape.type).toBe('polygon')
    })

    test('Test Z Position', async () => {
        const { player } = await onOutShape(box)
        player.position.z = 10
        await waitUntil(
            player.moveRoutes([Move.left()])
        )
        expect(player.position.z).toBe(10)
    })
})

describe('Get Size Box', () => {
    function getSizeBox(obj) {
        map = player.getCurrentMap() as RpgMap
        const shape = map.createShape(obj)
        return shape.getSizeBox(10)
    }

    test('Box', async () => {
        const obj = getSizeBox(box)
        expect(obj).toMatchObject({ minX: -10, maxX: 110, minY: -10, maxY: 110 })
    })

    test('Circle', async () => {
        const obj = getSizeBox(circle)
        expect(obj).toMatchObject({ minX: -10, maxX: 110, minY: -10, maxY: 110 })
    })

    test('Polygon', async () => {
        const obj = getSizeBox(polygon)
        expect(obj).toMatchObject({ minX: -10, maxX: 265, minY: -19, maxY: 283 })
    })
})

test('Shape In - change map - verify position client side', () => {
    return new Promise(async (resolve: any) => {
        clear()
        @MapData({
            id: 'myid',
            file: require('./fixtures/maps/map.tmx')
        })
        class SampleMap extends RpgMap { }

        @RpgModule<RpgServer>({
            maps: [SampleMap],
            player: {
                async onInShape(player: RpgPlayer, shape: RpgShape) {
                    await player.changeMap('myid', {
                        x: 100,
                        y: 120
                    })
                    await nextTick(client)
                    const object = client.gameEngine.world.getObject(player.id)
                    expect(object?.position.x).toBe(100)
                    expect(object?.position.y).toBe(120)
                    resolve()
                }
            }
        })
        class RpgServerModule { }

        const { player, client, server } = await _beforeEach([{
            server: RpgServerModule
        }])
        map = player.getCurrentMap() as RpgMap
        map.createShape({
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            name: 'test'
        })
        client.controls.setInputs(inputs)
        client.controls.applyControl(Control.Right, true)
        client.processInput()
        RpgPlugin.on(HookClient.SendInput, () => {
            server.step()
            client.controls.applyControl(Control.Right, false)
        })
    })
})

describe('Test Data Shape are send to client', () => {
    async function getShape(options) {
        map = player.getCurrentMap() as RpgMap
        map.createShape({
            x: 0,
            y: 0,
            name: 'test',
            ...options
        })
        await nextTick(client)
        const fixture = client.gameEngine.getShape('test')
        const shape = fixture?.object
        const data = fixture?.paramsChanged
        expect(shape).toBeInstanceOf(RpgShape)
        return { data, shape }
    }

    test('Box', async () => {
        const { data } = await getShape({
            width: 100,
            height: 100
        })
        expect(data).toMatchObject({ x: 0, y: 0, width: 100, height: 100, type: 'box' })
    })

    test('Polygon', async () => {
        const { shape, data } = await getShape({
            polygon: [{ x: 0, y: 0 }, { x: -59, y: 68 }, { x: 13, y: 109 }, { x: 50, y: 79 }]
        })
        expect(data).toMatchObject({ x: 0, y: 0, type: 'polygon' })
        expect(data).toHaveProperty('polygon')
        expect(shape.polygon).toHaveLength(4)
    })

    test('Circle', async () => {
        const { data } = await getShape({
            ellipse: true,
            width: 100,
            height: 100
        })
        expect(data).toMatchObject({ x: 50, y: 50, width: 0, height: 0, type: 'circle' })
    })
})

test('Attach Shape in player', () => {
    player.position.x = 50
    player.position.y = 50
    player.attachShape({
        width: 100,
        height: 100
    })
    const shapes = player.getShapes()
    expect(shapes).toHaveLength(1)
    const [shape] = shapes
    expect(shape.fixEvent).toBeTruthy()
    expect(shape.x).toBe(50)
    expect(shape.y).toBe(50)
    expect(shape.width).toBe(100)
    expect(shape.height).toBe(100)
})

test('Attach Shape in player (center)', () => {
    player.position.x = 50
    player.position.y = 50
    player.setHitbox(10, 10)
    player.attachShape({
        width: 100,
        height: 100,
        positioning: ShapePositioning.Center
    })
    const shapes = player.getShapes()
    const [shape] = shapes
    expect(shape.x).toBe(5)
    expect(shape.y).toBe(5)
    expect(shape.width).toBe(100)
    expect(shape.height).toBe(100)
})

afterEach(() => {
    clear()
})