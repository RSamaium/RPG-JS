import { RpgServer, RpgModule, RpgServerEngine, RpgMatchMaker, RpgWorld } from '@rpgjs/server'
import AgonesSDK from '@google-cloud/agones-sdk'
import { beforeEach, vi, expect, afterEach, test, describe } from 'vitest'

process.env.MATCH_MAKER_URL = 'test'
process.env.MATCH_MAKER_SECRET_TOKEN = 'test'
process.env.SERVER_ID = 'server1'

import agones from '../src'
import { _beforeEach } from '../../../../../tests/unit-tests/specs/beforeEach'
// @ts-ignore
import { clear } from '@rpgjs/testing'
import { RpgClient, RpgClientEngine } from '@rpgjs/client'

let client: RpgClientEngine
let player, fixture, playerId, agonesSDK
let server: RpgServerEngine
let store
let mockMatchmaker

vi.mock('@google-cloud/agones-sdk')

vi.mock('../src/redisStore', () => {
    class RedisMockStore {
        private client: Map<string, any>

        async connect() {
            this.client = new Map()
        }

        async set(key: string, val: any): Promise<any> {
            return this.client.set(key, val)
        }

        async get(key: string): Promise<string | null> {
            return this.client.get(key)
        }
    }
    return {
        RedisStore: RedisMockStore
    }
})

const MATCH_MAKER_SERVICE = [
    {
        url: 'fake',
        port: 7000,
        serverId: 'server1'
    },
    {
        url: 'fake',
        port: 7001,
        serverId: 'server2'
    }
]

beforeEach(async () => {
    @RpgModule<RpgClient>({
        engine: {
            onStart(client: RpgClientEngine) {
                client.globalConfig.matchMakerService = () => {
                    return MATCH_MAKER_SERVICE[0]
                }
            }
        }
    })
    // @ts-ignore
    class RpgClientMockModule { }

    @RpgModule<RpgServer>({
        maps: [
            {
                id: 'map2',
                file: require('../../../../../tests/unit-tests/specs/fixtures/maps/map.tmx')
            }
        ]
    })
    // @ts-ignore
    class RpgServerModule { }

    mockMatchmaker = vi.fn(() => {
        return MATCH_MAKER_SERVICE[0]
    })

    agones.server.prototype.scalability.matchMaker = {
        callback: mockMatchmaker
    }
    
    const ret = await _beforeEach([
        agones,
        {
            server: RpgServerModule,
            client: RpgClientMockModule
        }
    ], {
        changeMap: false
    })
    client = ret.client
    server = ret.server
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
    agonesSDK = AgonesSDK.mock.instances[0]
    store = agones.server.prototype.scalability.stateStore.client

})

test('Agones is connected', () => {
    expect(agonesSDK.connect).toHaveBeenCalled()
})

test('Get Server Id, set label Id and is ready', () => {
    expect(server.serverId).toBe('server1')
    expect(agonesSDK.setLabel).toBeCalledWith('server-id', 'server1')
    expect(agonesSDK.ready).toHaveBeenCalled()
    expect(agonesSDK.health).toHaveBeenCalled()
})

test('Change Map, notice that the server is different', async () => {
    mockMatchmaker.mockReturnValue(MATCH_MAKER_SERVICE[1])
    const spy = vi.spyOn(client, 'connection')
    await player.changeMap('map')
    expect(mockMatchmaker).toHaveBeenCalled()
    expect(mockMatchmaker).toHaveReturnedWith(MATCH_MAKER_SERVICE[1])
    expect(spy).toHaveBeenCalled()
    const { url, port } = MATCH_MAKER_SERVICE[1]
    expect(spy).toHaveBeenCalledWith(url + ':' + port)
    spy.mockRestore()
})

test('Change Map, state is saved', async () => {
    mockMatchmaker.mockReturnValue(MATCH_MAKER_SERVICE[1])
    await player.changeMap('map')
    expect(store.size).toBe(1)
    expect(store.has(player.session)).toBeDefined()
    const value = store.get(player.session)
    expect(typeof value == 'string').toBe(true)
    const json = JSON.parse(value)
    expect(json).toHaveProperty('position')
})

test('Change Map, session is send to client', async () => {
    await fixture.changeMap(client, 'map')
    expect(client['session']).toBe(player.session)
})

test('Change Server, state is shared', async () => {
    await fixture.changeMap(client, 'map')
    player.hp = 100
    mockMatchmaker.mockReturnValue(MATCH_MAKER_SERVICE[1])
    await player.changeMap('map2')
    const newPlayer = RpgWorld.getPlayers()[0]
    expect(newPlayer.playerId).not.toBe(playerId)
    expect(newPlayer.hp).toBe(100)
})

test('Change Server, not load map in current server', async () => {
    mockMatchmaker.mockReturnValue(MATCH_MAKER_SERVICE[1])
    const spy = vi.spyOn(server.sceneMap, 'loadMap')
    await player.changeMap('map')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
})

test('Join Map, allocate server', async () => {
    await player.changeMap('map')
    expect(agonesSDK.setLabel).toBeCalledWith('map-map', '1')
    expect(agonesSDK.allocate).toHaveBeenCalled()
})

test('Disconnect, shutdown server if last player', async () => {
    await player.changeMap('map')
    client.socket.disconnect()
    expect(agonesSDK.shutdown).toHaveBeenCalled()
})

test('Disconnect, not shutdown server because is not last player', async () => {
    await player.changeMap('map')
    const { playerId: secondId } = await fixture.createClient()
    const secondPlayer = RpgWorld.getPlayer(secondId)
    await secondPlayer.changeMap('map')
    client.socket.disconnect()
    expect(agonesSDK.shutdown).not.toHaveBeenCalled()
})

describe('Multi map', () => {
    let secondPlayer

    beforeEach(async () => {
        const { playerId: secondId } = await fixture.createClient()
        secondPlayer = RpgWorld.getPlayer(secondId)
        await secondPlayer.changeMap('map')
    })

    test('Leave Map, change map label to 0', async () => {
        await player.changeMap('map2')
        expect(agonesSDK.setLabel).toBeCalledWith('map-map2', '1')
        expect(agonesSDK.shutdown).not.toHaveBeenCalled()

        await player.changeMap('map')
        expect(agonesSDK.setLabel).toBeCalledWith('map-map2', '0')
        expect(agonesSDK.shutdown).not.toHaveBeenCalled()
    })

    test('Leave Map, not change label map because have second player in map', async () => {
        await player.changeMap('map2')
        await player.changeMap('map')
        expect(agonesSDK.setLabel).toBeCalledWith('map-map2', '0')
        expect(agonesSDK.setLabel).toBeCalledWith('map-map', '1')
    })
    
})

afterEach(() => {
    agones.server.prototype.scalability.stateStore.client = new Map()
    AgonesSDK.mockClear()
    clear()
})