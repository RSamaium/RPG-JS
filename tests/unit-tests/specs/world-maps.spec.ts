import WORLD from './fixtures/maps/world'
import {_beforeEach} from './beforeEach'
import { RpgModule, RpgMap, RpgPlayer, RpgServer, RpgServerEngine, RpgSceneMap, RpgWorldMaps, Direction, Move, MapData, RpgWorld } from '@rpgjs/server'
import { RpgClientEngine } from '@rpgjs/client'
import { clear, waitUntil } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe } from 'vitest'

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
            (fixtureWorld as any)
        ]
    })
    class RpgServerModule {}

    const ret = await _beforeEach([{
        server: RpgServerModule
    }], {}, {
        drawMap: false
    })

    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
    map = player.getCurrentMap() as RpgMap
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

test('Get already map', async () => {
    clear()

    @MapData({
        file: require('./fixtures/maps/map.tmx'),
        id: '1'
    })
    class MyMap extends RpgMap{
        static proof = true
    }

    @RpgModule<RpgServer>({
        maps: [
            MyMap
        ],
        worldMaps: [
            (fixtureWorld as any)
        ]
    })
    class RpgServerModule {}

    const { server } = await _beforeEach([{
        server: RpgServerModule
    }], {}, {
        drawMap: false
    })

    const sceneMap = server.sceneMap as RpgSceneMap
    const world = sceneMap?.getWorldMaps(WORLD_ID) as RpgWorldMaps
    const [firstWorldMap] = world['mapsTree'].data.children
    expect(firstWorldMap.map.proof).toBeDefined()
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

    test('Remove map of World map', async () => {
        await player.changeMap(mapWorld.id)
        const map = player.getCurrentMap()
        map?.removeFromWorldMaps()
        const worldMaps = map?.getInWorldMaps()
        expect(worldMaps).toBeUndefined()
        expect(world['mapsTree'].data.children).toHaveLength(NB_MAPS-1)
        expect(world['maps'].size).toBe(NB_MAPS-1)
    })
    
    test('Maps have world parent', async () => {
        await player.changeMap(mapWorld.id)
        const map = player.getCurrentMap()
        expect(map?.id).toBe(mapWorld.id)
        const worldMaps = map?.getInWorldMaps()
        expect(worldMaps).toBeTruthy()
        expect(worldMaps?.id).toBe(WORLD_ID)
    })

    test('Find the positions of the map in the world', async () => {
        await player.changeMap(mapWorld.id)
        const map = player.getCurrentMap()
        expect(map?.worldX).toBe(WORLD.maps[0].x)
        expect(map?.worldY).toBe(WORLD.maps[0].y)
    })

    test('Find the positions of the player in the world', async () => {
        await player.changeMap(mapWorld.id, {
            x: 50,
            y: 60
        })
        const map = player.getCurrentMap()
        expect(player.worldPositionX).toBe(WORLD.maps[0].x + 50)
        expect(player.worldPositionY).toBe(WORLD.maps[0].y + 60)
    })

    describe('Test canChangeMap Hook', () => {
        test('(true)', async () => {
            @RpgModule<RpgServer>({
                player: {
                    canChangeMap(player: RpgPlayer, NextMap: any) {
                        expect(player).toBeDefined()
                        expect(NextMap.id).toBeDefined()
                        return true
                    }
                }
            })
            class RpgServerModule {}
    
            clear()

            await _beforeEach([{
                server: RpgServerModule
            }])
        })

        test('(false)', async () => {
            let i=0
            @RpgModule<RpgServer>({
                player: {
                    canChangeMap() {
                        i++
                        if (i==1) return true
                        return false
                    }
                }
            })
            class RpgServerModule {}

            clear()
    
            const { player } = await _beforeEach([{
                server: RpgServerModule
            }])

            await player.changeMap(mapWorld.id)
            const map = player.getCurrentMap()
            expect(map.id).toBe('map')
        })
    })

    describe('Find map by direction and position', () => {
        const getAdjacentMaps = async (direction) => {
            await player.changeMap(mapWorld.id)
            const map = player.getCurrentMap()
            const maps = world.getAdjacentMaps(map as RpgMap, direction)
            return maps
        }

        test('Up', async () => {
            const maps = await getAdjacentMaps(Direction.Up)
            expect(maps).toHaveLength(2)
            expect(maps[0].id).toBe('2')
            expect(maps[1].id).toBe('3')
        })

        test('Right', async () => {
            const maps = await getAdjacentMaps(Direction.Right)
            expect(maps).toHaveLength(1)
            expect(maps[0].id).toBe('7')
        })

        test('Down', async () => {
            const maps = await getAdjacentMaps(Direction.Down)
            expect(maps).toHaveLength(2)
            expect(maps[0].id).toBe('5')
            expect(maps[1].id).toBe('6')
        })

        test('Left', async () => {
            const maps = await getAdjacentMaps(Direction.Left)
            expect(maps).toHaveLength(1)
            expect(maps[0].id).toBe('4')
        })

        test('Get By Position (box)', async () => {
            const maps = await getAdjacentMaps({ minX: 400, maxX: 401, minY: 1280, maxY: 1279 })
            expect(maps).toHaveLength(1)
            expect(maps[0].id).toBe('3')
        })

        test('Get By Position (point)', async () => {
            const maps = await getAdjacentMaps({ x: 401, y: 1279 })
            expect(maps).toHaveLength(1)
            expect(maps[0].id).toBe('3')
        })
    })

    describe('Auto Change Map', () => {
        test('Left', async () => {
            await player.changeMap(mapWorld.id, {
                x: 18,
                y: 30
            })
            await waitUntil(
                player.moveRoutes([ Move.left() ])
            )
            expect(player.map).toBe('4')
            expect(player.position.x).toBe(WORLD.maps[3].width - player.hitbox.w - map.tileWidth / 2)
            expect(player.position.y).toBe(30)
        })

        test('Up', async () => {
            await player.changeMap(mapWorld.id, {
                x: 105,
                y: 18
            })
            await waitUntil(
                player.moveRoutes([ Move.up() ])
            )
            expect(player.map).toBe('2')
            expect(player.position.x).toBe(105 - 32 * 3)
            expect(player.position.y).toBe(WORLD.maps[1].height - player.hitbox.h - map.tileHeight / 2)
        })

        test('Right', async () => {
            const info = world.getMapInfo(mapWorld.id)
            await player.changeMap(mapWorld.id, {
                x: (info?.width || 0) - player.hitbox.w - map.tileWidth / 2 - 2,
                y: 384
            })
            await waitUntil(
                player.moveRoutes([ Move.right() ])
            )
            expect(player.map).toBe('7')
            expect(player.position.x).toBe(16)
            expect(player.position.y).toBe(64)
        })

        test('Down (1)', async () => {
            const info = world.getMapInfo(mapWorld.id)
            await player.changeMap(mapWorld.id, {
                x: 0,
                y: (info?.height || 0) - player.hitbox.h - map.tileHeight / 2 - 2
            })
            await waitUntil(
                player.moveRoutes([ Move.down() ])
            )
            expect(player.map).toBe('5')
            expect(player.position.x).toBe(5 * 32)
            expect(player.position.y).toBe(16)
        })

        test('Down (2)', async () => {
            const info = world.getMapInfo(mapWorld.id)
            await player.changeMap(mapWorld.id, {
                x: 800,
                y: (info?.height || 0) - player.hitbox.h - map.tileHeight / 2 - 2
            })
            await waitUntil(
                player.moveRoutes([ Move.down() ])
            )
            expect(player.map).toBe('6')
            expect(player.position.x).toBe(0)
            expect(player.position.y).toBe(16)
        })
        
    })
    
})

afterEach(() => {
    clear()
})