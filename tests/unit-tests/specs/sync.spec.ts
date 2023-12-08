import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'
import { RpgPlayer, RpgMap, MapData, RpgModule, RpgServer } from '@rpgjs/server'
import { beforeEach, test, afterEach, expect, describe, vi } from 'vitest'

let client, fixture, playerId, server
let player: RpgPlayer

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
})

describe('Test props', () => {
    test('sync props', async () => {
        clear()

        @RpgModule<RpgServer>({
            player: {
                props: {
                    bronze: Number
                },
                onJoinMap(player, map) {
                    player['bronze'] = 100
                },
            }
        })
        class RpgServerModule {}

        const { server, client } = await _beforeEach([{
            server: RpgServerModule
        }])

        await server.send()

        expect(client.player.bronze).toEqual(100)
    })
})

// https://community.rpgjs.dev/d/244-playeradditem-bug
test('change map before, sync player', async () => {
    const sceneMap = server.sceneMap

    @MapData({
        id: 'myid',
        file: require('./fixtures/maps/map.tmx')
    })
    class SampleMap extends RpgMap { }

    sceneMap.createDynamicMap(SampleMap)

    await player.changeMap('myid')

    player.gold += 100

    await server.send()

    expect(client.player.gold).toEqual(player.gold)
})

afterEach(() => {
    clear()
})