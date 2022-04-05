import {_beforeEach} from './beforeEach'
import { HookClient, RpgMap, RpgPlayer,  RpgServerEngine, ShapePositioning, RpgShape, RpgServer, RpgModule, Move, MapData } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, RpgPlugin } from '@rpgjs/client'
import { clear, nextTick } from '@rpgjs/testing'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server: RpgServerEngine, 
map: RpgMap,
sceneMap: RpgSceneMap,
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
    sceneMap = client.getScene<RpgSceneMap>()
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

 test('Shape In - Hook', async () => {
     return new Promise(async (resolve: any) => {
         clear()

         @RpgModule<RpgServer>({
             player: {
                 onInShape(player: RpgPlayer,shape: RpgShape) {
                    expect(player.id).toBeDefined()
                    expect(shape.name).toBeDefined()
                    resolve()
                 }
             }
         })
         class RpgServerModule {}
 
         const { player } = await _beforeEach([{
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
        await player.moveRoutes([ Move.right() ])
     })
 })

 test('Shape In - change map - verify position client side', () => {
    return new Promise(async (resolve: any) => {
        clear()

        @MapData({
            id: 'myid',
            file: require('./fixtures/maps/map.tmx')
        })
        class SampleMap extends RpgMap {}

        @RpgModule<RpgServer>({
            maps: [SampleMap],
            player: {
                async onInShape(player: RpgPlayer, shape: RpgShape) {
                    await player.changeMap('myid', {
                        x: 100,
                        y: 120
                    })
                }
            }
        })
        class RpgServerModule {}

        const { player } = await _beforeEach([{
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
        await player.moveRoutes([ Move.right() ])
        await nextTick(client)
        const object = client.gameEngine.world.getObject(playerId)
        expect(object?.position.x).toBe(100)
        expect(object?.position.y).toBe(120)
        resolve()
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