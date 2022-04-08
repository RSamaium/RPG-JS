import { Potion, Key } from './fixtures/item'
import {_beforeEach} from './beforeEach'
import { RpgModule, RpgMap, RpgPlayer, RpgPlugin, RpgServer, RpgServerEngine, RpgSceneMap, RpgWorldMaps } from '@rpgjs/server'
import { RpgClientEngine } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server: RpgServerEngine, 
map: RpgMap,
sceneMap: RpgSceneMap | null,
side: string,
world: RpgWorldMaps

const WORLD_ID = 'myworld'
const fixtureWorld = {
    id: WORLD_ID,
    "maps": [
        {
            "fileName": require("./fixtures/maps/map.tmx"),
            "height": 6400,
            "width": 6400,
            "x": 352,
            "y": 1248
        },
        {
            "fileName": require("./fixtures/maps/map.tmx"),
            "height": 1920,
            "width": 1920,
            "x": 448,
            "y": -672
        }
    ],
    "onlyShowAdjacentMaps": false,
    "type": "world"
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
    sceneMap = server.sceneMap
    world = sceneMap?.getWorldMaps(WORLD_ID) as RpgWorldMaps
})

test('World Map is defined', () => {
    expect(world.id).toBe(WORLD_ID)
})

test('World Map have two maps', () => {
    expect(world['maps'].data.children).toHaveLength(2)
})

afterEach(() => {
    clear()
})