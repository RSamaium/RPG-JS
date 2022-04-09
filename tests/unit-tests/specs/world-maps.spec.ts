import WORLD from './fixtures/maps/world'
import {_beforeEach} from './beforeEach'
import { RpgModule, RpgMap, RpgPlayer, RpgPlugin, RpgServer, RpgServerEngine, RpgSceneMap, RpgWorldMaps, Direction } from '@rpgjs/server'
import { RpgClientEngine } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server: RpgServerEngine, 
map: RpgMap,
sceneMap: RpgSceneMap,
side: string,
world: RpgWorldMaps

const NB_MAPS =  WORLD.maps.length
const WORLD_ID = 'myworld'
const fixtureWorld = {
    id: WORLD_ID,
    ...WORLD
}

beforeEach(async () => {

    @RpgModule<RpgServer>({
        worldMaps: [
            fixtureWorld
        ]
    })
    class RpgServerModule {}

    const ret = await _beforeEach([{
        server: RpgServerModule
    }])

    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
    map = player.getCurrentMap()
    sceneMap = server.sceneMap as RpgSceneMap
    world = sceneMap?.getWorldMaps(WORLD_ID) as RpgWorldMaps
})

test('World Map is defined', () => {
    expect(world.id).toBe(WORLD_ID)
})

test('Maps is created', () => {
    const maps = Object.values(sceneMap['mapsById'])
    expect(maps).toHaveLength(1 + NB_MAPS)
    const expectMap = (index) => {
        const map: any = maps[index]
        expect(map.file).toBeDefined()
        expect(map.id).toBeDefined()
    }
    for (let i=1 ; i <= NB_MAPS ; i++) {
        expectMap(i)
    }
})

test('World Map have two maps', () => {
    expect(world['mapsTree'].data.children).toHaveLength(NB_MAPS)
    expect(world['maps'].size).toBe(NB_MAPS)
})

describe('Go to Map in world', () => {
    let mapWorld, otherMap

    beforeEach(() => {
        const maps = Object.values(sceneMap['mapsById'])
        mapWorld = maps[0]
        otherMap = maps[1]
    })

    test('get custom id', () => {
        expect(mapWorld.id).toBe('1')
    })

    test('Find the information on the map', () => {
        const info = world.getMapInfo(mapWorld.id)
        expect(info?.fileName).toBeTruthy()
        expect(info?.x).toBe(WORLD.maps[0].x)
        expect(info?.y).toBe(WORLD.maps[0].y)
    })

    test('Maps have world parent', async () => {
        await player.changeMap(mapWorld.id)
        const map = player.getCurrentMap()
        expect(map.id).toBe(mapWorld.id)
        const worldMaps = map.getInWorldMaps()
        expect(worldMaps).toBeTruthy()
        expect(worldMaps?.id).toBe(WORLD_ID)
    })

    test('Find the positions of the map in the world', async () => {
        await player.changeMap(mapWorld.id)
        const map = player.getCurrentMap()
        expect(map.worldX).toBe(WORLD.maps[0].x)
        expect(map.worldY).toBe(WORLD.maps[0].y)
    })

    test('Find the map above', async () => {
        await player.changeMap(mapWorld.id)
        const map = player.getCurrentMap()
        const maps = world.getAdjacentMaps(map, Direction.Up)
        expect(maps).toHaveLength(2)
        expect(maps[0].id).toBe('2')
        expect(maps[1].id).toBe('3')
    })
})

afterEach(() => {
    clear()
})