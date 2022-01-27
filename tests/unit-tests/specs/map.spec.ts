import { Potion, Key } from './fixtures/item'
import {_beforeEach} from './beforeEach'
import { RpgMap, RpgPlayer } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap } from '@rpgjs/client'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server, 
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

const getMap = (side) => {
    return side == 'server' ? map : sceneMap
}

const testMap = function(side) {
    test('get current map', () => {
        const map = getMap(side)
        expect(map).toBeDefined()
        expect(map.tileWidth).toEqual(TILE_SIZE)
        expect(map.tileHeight).toEqual(TILE_SIZE)
        expect(map.layers).toHaveLength(1)
        expect(map.widthPx).toEqual(TILE_SIZE*10)
        expect(map.heightPx).toEqual(TILE_SIZE*10)
        expect(map.zTileHeight).toEqual(TILE_SIZE)
        expect(map.getLayerByName(LAYER_NAME)).toMatchObject({
            type: 'tile',
            name: LAYER_NAME
        })
    })
    
    describe('Tile System', () => {
        test('get tile by index', () => {
            const map = getMap(side)
            expect(map.getTileIndex(0, 0)).toEqual(0)
            const tile = map.getTileByIndex(0)
            expect(tile).toMatchObject({
                tiles: [],
                hasCollision: true,
                isOverlay: false,
                objectGroups: [],
                tileIndex: 0
            })
        })
        
        test('get tile by position', () => {
            const map = getMap(side)
            const origin = map.getTileOriginPosition(35, 12)
            expect(origin.x).toEqual(TILE_SIZE)
            expect(origin.y).toEqual(0)
        })
    
        test('get tile by position', () => {
            const map = getMap(side)
            const origin = map.getTileOriginPosition(35, 12)
            expect(origin.x).toEqual(TILE_SIZE)
            expect(origin.y).toEqual(0)
            const tile = map.getTileByPosition(35, 12)
            expect(tile).toMatchObject({
                tiles: [],
                hasCollision: true,
                isOverlay: false,
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
        const tileInfo = map.getTileByPosition(0, 0)
        expect(tileInfo.tiles[0].gid).toEqual(2)

        const tileInfoClient = sceneMap.getTileByPosition(0, 0)
        expect(tileInfoClient.tiles[0].gid).toEqual(2)
    })
})
