import { Potion, Key } from './fixtures/item'
import {_beforeEach} from './beforeEach'
import { EventData, HookClient, MapData, RpgEvent, RpgMap, RpgPlayer, RpgPlugin, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe } from 'vitest'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server: RpgServerEngine, 
map: RpgMap,
sceneMap: RpgSceneMap | null,
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

const getMap = (side) => {
    return side == 'server' ? map : sceneMap
}

const testMap = function(side) {
    test('get current map', () => {
        const map = getMap(side)
        expect(map).toBeDefined()
        expect(map?.tileWidth).toEqual(TILE_SIZE)
        expect(map?.tileHeight).toEqual(TILE_SIZE)
        expect(map?.layers).toHaveLength(2)
        expect(map?.widthPx).toEqual(TILE_SIZE*10)
        expect(map?.heightPx).toEqual(TILE_SIZE*10)
        expect(map?.zTileHeight).toEqual(TILE_SIZE)
        expect(map?.getLayerByName(LAYER_NAME)).toMatchObject({
            type: 'tilelayer',
            name: LAYER_NAME
        })
    })
    
    describe('Tile System', () => {
        test('get tile by index', () => {
            const map = getMap(side)
            expect(map?.getTileIndex(0, 0)).toEqual(0)
            const tile = map?.getTileByIndex(0)
            expect(tile).toMatchObject({
                ...tile,
                hasCollision: false,
                objectGroups: [],
                tileIndex: 0
            })
        })
        
        test('get tile by position', () => {
            const map = getMap(side)
            const origin = map?.getTileOriginPosition(35, 12)
            expect(origin?.x).toEqual(TILE_SIZE)
            expect(origin?.y).toEqual(0)
        })
    
        test('get tile by origin position', () => {
            const map = getMap(side)
            const origin = map?.getTileOriginPosition(35, 12)
            expect(origin?.x).toEqual(TILE_SIZE)
            expect(origin?.y).toEqual(0)
            const tile = map?.getTileByPosition(35, 12)
            expect(tile).toMatchObject({
                ...tile,
                hasCollision: false,
                objectGroups: [],
                tileIndex: 1
            })
        })
    })
}

describe('Client Side', () => {
    testMap('client')
})

describe('Server Side', () => {
    testMap('server')

    test('set tile', () => {
        const tile = map.setTile(0, 0, LAYER_NAME, {
            gid: 2
        })
        expect(tile).toMatchObject({ x: 0, y: 0, tiles: { [LAYER_NAME]: { gid: 2 } } })
        
        const layer = map.getLayerByName(LAYER_NAME)
        expect(layer?.data[0]).toEqual(2)
        
        const tileInfo = map.getTileByPosition(0, 0)
        expect(tileInfo.tiles[0].gid).toEqual(2)

        const tileInfoClient = sceneMap?.getTileByPosition(0, 0)
        expect(tileInfoClient.tiles[0].gid).toEqual(2)
    })

    test('Create Dynamic Map, Class', async () => {
        const sceneMap = server.sceneMap

        @MapData({
            id: 'myid',
            file: require('./fixtures/maps/map.tmx')
        })
        class SampleMap extends RpgMap {}

        sceneMap.createDynamicMap(SampleMap)
        await player.changeMap('myid')
    })

    test('Create Dynamic Map, Object', async () => {
        const sceneMap = server.sceneMap
        sceneMap.createDynamicMap({
            id: 'myid',
            file: require('./fixtures/maps/map.tmx')
        })
        await player.changeMap('myid')
    })

    test('onJoin hook', async () => {
        return new Promise(async (resolve: any) => {
            const sceneMap = server.sceneMap

            @MapData({
                id: 'myid',
                file: require('./fixtures/maps/map.tmx')
            })
            class SampleMap extends RpgMap {
                onJoin(player: RpgPlayer) {
                    expect(player).toBeDefined()
                    resolve()
                }
            }

            sceneMap.createDynamicMap(SampleMap)
            await player.changeMap('myid')
        })
    })

    test('onLeave hook', async () => {
        return new Promise(async (resolve: any) => {
            const sceneMap = server.sceneMap

            @MapData({
                id: 'myid',
                file: require('./fixtures/maps/map.tmx')
            })
            class SampleMap extends RpgMap {
                onLeave(player: RpgPlayer) {
                    expect(player).toBeDefined()
                    resolve()
                }
            }

            sceneMap.createDynamicMap(SampleMap)
            await player.changeMap('myid')
            await player.changeMap('map')
        })
    })

    test('onLoad hook', async () => {
        return new Promise(async (resolve: any) => {
            const sceneMap = server.sceneMap

            @MapData({
                id: 'myid',
                file: require('./fixtures/maps/map.tmx')
            })
            class SampleMap extends RpgMap {
                onLoad() {
                    expect(this.data).toBeDefined()
                    const tile = this.getTileByPosition(0, 0)
                    expect(tile.tileIndex).toBe(0)
                    resolve()
                }
            }

            sceneMap.createDynamicMap(SampleMap)
            await player.changeMap('myid')
        })
    })
})

test('Player Teleport in map', async () => {
    player.teleport({ x: 100, y: 200 })
    expect(player.position).toMatchObject({ x: 100, y: 200, z: 0 })
    await server.send()
    const playerClient = client.gameEngine.world.getObject(playerId)
    const { x, y } = playerClient?.position || {}
    expect(x).toEqual(100)
    expect(y).toEqual(200)
})

test('Player Teleport in map by shape', () => {
    map.createShape({
        x: 100,
        y: 200,
        name: 'start'
    })
    player.teleport('start')
    expect(player.position).toMatchObject({ x: 100, y: 200, z: 0 })
})


// TODO: test remove map

afterEach(() => {
    clear()
})