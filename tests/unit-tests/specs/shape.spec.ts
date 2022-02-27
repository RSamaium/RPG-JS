import {_beforeEach} from './beforeEach'
import { EventData, HookClient, MapData, Move, RpgEvent, RpgMap, RpgModule, RpgPlayer, RpgPlugin, RpgServer, RpgServerEngine, RpgShape } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'

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
    sceneMap = client.scene
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
         server.send()
    })
 })

 test('Shape In - Hook', () => {
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
        player.moveRoutes([ Move.right() ])
     })
 })

afterEach(() => {
    clear()
})