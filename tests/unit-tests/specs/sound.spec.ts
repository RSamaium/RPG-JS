import {_beforeEach} from './beforeEach'
import { EventData, Input, MapData, RpgEvent, RpgMap, RpgModule, RpgPlayer, RpgServer, RpgServerEngine, RpgWorld } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, Control, Sound, RpgClient, RpgSound } from '@rpgjs/client'
import { clear, nextTick } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, vi } from 'vitest'

let  client: RpgClientEngine, 
player: RpgPlayer,
server: RpgServerEngine,
fixture

beforeEach(async () => {

    @Sound({
        sounds: {
            town: require('./fixtures/sounds/Town_Theme.ogg'),
        },
        loop: true,
        volume: 0.5
    })
    class Musics {}

    @RpgModule<RpgClient>({ 
        sounds: [
            Musics
        ]
    })
    class RpgClientModuleEngine {} 

    @MapData({
        id: 'map1',
        file: require('./fixtures/maps/map.tmx'),
        sounds: ['town']
    })
    class SampleMap1 extends RpgMap {}

    @MapData({
        id: 'map2',
        file: require('./fixtures/maps/map.tmx'),
        sounds: ['town']
    })
    class SampleMap2 extends RpgMap {}

    @RpgModule<RpgServer>({ 
        maps: [
            SampleMap1,
            SampleMap2
        ]
    })
    class RpgServerModuleEngine {} 

    const ret = await _beforeEach([
        {
            client: RpgClientModuleEngine,
            server: RpgServerModuleEngine
        }
    ])
    client = ret.client
    player = ret.player
    server = ret.server
    fixture = ret.fixture
})

test('Sound is defined', () => {
    const sound = RpgSound.get('town')
    expect(sound).toBeDefined()
})

test('Sound is playing in map', async () => {
    const spy = vi.spyOn(RpgSound, 'play')
    await player.changeMap('map1')
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveReturnedWith(true)
    spy.mockReset()
    spy.mockRestore()
})


test('Sound is stopped after change map', async () => {
    await player.changeMap('map1')
    const spyPlay = vi.spyOn(RpgSound, 'stop')
    await player.changeMap('map')
    expect(spyPlay).toHaveBeenCalled() 
    spyPlay.mockReset()
    spyPlay.mockRestore()
})

test('Sound continue in map after change map', async () => {
    await fixture.changeMap(client, 'map1')
    const spy = vi.spyOn(RpgSound, 'stop')
    await fixture.changeMap(client, 'map2')
    expect(spy).not.toHaveBeenCalled()
    spy.mockReset()
    spy.mockRestore()
})

test('Player sound [server side]', () => {
    const spy = vi.spyOn(RpgSound, 'play')
    player.playSound('town')
    expect(spy).toHaveBeenCalled()
    spy.mockReset()
    spy.mockRestore()
})

/*
TODO: fix this test
test('Player sound, broadcast [server side]', async () => {
    const clientFixture = await fixture.createClient()
    await fixture.changeMap(clientFixture.client, 'map')
    server.send()
    const spy = vi.spyOn(RpgSound, 'play')
    player.playSound('town', true)
    server.send()
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockReset()
    spy.mockRestore()
})
*/

afterEach(() => {
    clear()
})