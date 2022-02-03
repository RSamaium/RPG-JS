import {_beforeEach} from './beforeEach'
import { EventData, Input, MapData, RpgEvent, RpgMap, RpgModule, RpgPlayer, RpgPlayerHooks, RpgServer, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, Control } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { inputs } from './fixtures/control'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server: RpgServerEngine, 
map: RpgMap,
sceneMap: RpgSceneMap

test('Test onConnected Hook', () => {
    return new Promise(async (resolve: any) => {
        @RpgModule<RpgServer>({
            player: {
                onConnected(player: RpgPlayer) {
                    expect(player).toBeDefined()
                    resolve()
                }
            }
        })
        class RpgServerModule {}

        await _beforeEach([{
            server: RpgServerModule
        }])
    })
})


test('Test onJoinMap Hook', () => {
    return new Promise(async (resolve: any) => {
        @RpgModule<RpgServer>({
            player: {
                onJoinMap(player: RpgPlayer, map: RpgMap) {
                    expect(player).toBeDefined()
                    expect(map).toBeDefined()
                    const playerMap = player.getCurrentMap() as RpgMap
                    expect(playerMap.id).toEqual(map.id)
                    resolve()
                }
            }
        })
        class RpgServerModule {}

        await _beforeEach([{
            server: RpgServerModule
        }])
    })
})

test('Test onLeaveMap Hook', () => {
    return new Promise(async (resolve: any) => {
        @MapData({
            id: 'other-map',
            file: require('./fixtures/maps/map.tmx')
        })
        class OtherMap extends RpgMap {}

        @RpgModule<RpgServer>({
            maps: [
                OtherMap
            ],
            player: {
                onLeaveMap(player: RpgPlayer, map: RpgMap) {
                    expect(player).toBeDefined()
                    expect(map).toBeDefined()
                    expect(player.prevMap).toEqual('map')
                    const playerMap = player.getCurrentMap() as RpgMap
                    expect(playerMap.id).toEqual('map')
                    expect(playerMap.id).toEqual(map.id)
                    resolve()
                }
            }
        })
        class RpgServerModule {}

        const { player } = await _beforeEach([{
            server: RpgServerModule
        }])

        player.changeMap('other-map')
    })
})

afterEach(() => {
    clear()
})