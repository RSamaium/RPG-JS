import {_beforeEach} from './beforeEach'
import { RpgPlayer, RpgWorld } from '@rpgjs/server'
import { SocketMethods, SocketEvents } from '@rpgjs/common'
import { RpgClientEngine, RpgSceneMap } from '@rpgjs/client'
import { clear, nextTick } from '@rpgjs/testing'

let client: RpgClientEngine, 
player: RpgPlayer,
secondPlayer: RpgPlayer,
secondClient: RpgClientEngine


function getEmitParams(options = {}) {
    return [SocketEvents.CallMethod, {
        "name": SocketMethods.CameraFollow, 
        "objectId": player.id, 
        "params": [secondPlayer.id, options]
    }]
}

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    const clientFixture = await ret.fixture.createClient()
    secondClient = clientFixture.client
    await ret.fixture.changeMap(secondClient, 'map')
    const secondPlayerId = clientFixture.playerId
    secondPlayer = RpgWorld.getPlayer(secondPlayerId)
    await nextTick(client)
})

describe('Spy emitToMap', () => {
    let spy

    beforeEach(() => {
        spy = jest.spyOn(player, 'emit');
    })

    test('player.cameraFollow() test', () => {
        player.cameraFollow(secondPlayer)
        expect(spy).toHaveBeenCalled()
        expect(spy).toHaveBeenCalledWith(...getEmitParams())
    })
    
    test('player.cameraFollow() with option', () => {
        const options = {
            smoothMove: {
                time: 3000
            }
        }
        player.cameraFollow(secondPlayer, options)
        expect(spy).toHaveBeenCalledWith(...getEmitParams(options))
    })
    
    test('following property', async () => {
        player.cameraFollow(secondPlayer)
        expect(player.following?.id).toBe(secondPlayer.id)
    })

    test('follow and, next,  client exit', async () => {
        player.cameraFollow(secondPlayer)
        secondClient.socket.disconnect()
        expect(player.following).toBe(null)
    })
})

describe('Client Apply', () => {
    test('viewport follow called', () => {
        const scene = client.getScene<RpgSceneMap>()
        const spy = jest.spyOn(scene?.viewport as any, 'follow');
        player.cameraFollow(secondPlayer)
        expect(spy).toHaveBeenCalled()
    })

    test('viewport animate called (without easing)', () => {
        const viewport = client.getScene<RpgSceneMap>()?.viewport as any
        const spy = jest.spyOn(viewport, 'animate');
        const spyFollow = jest.spyOn(viewport, 'follow');
        const viewportPlugin = jest.spyOn(viewport?.plugins, 'remove');
        player.cameraFollow(secondPlayer, {
            smoothMove: {
                time: 3000
            }
        })
        viewport.update(3000)
        expect(spy).toHaveBeenCalled()
        expect(spyFollow).toHaveBeenCalled()
        expect(viewportPlugin).toHaveBeenCalled()
        expect(viewportPlugin).toHaveBeenCalledWith('follow')
        expect(spy).toHaveBeenCalledWith(
            expect.objectContaining({ 
                position: { x: expect.any(Number), y: expect.any(Number) },
                time: 3000,
                callbackOnComplete: expect.any(Function)
            })
        )
    })

    test('viewport animate called (easing)', () => {
        const spy = jest.spyOn(client.getScene<RpgSceneMap>()?.viewport as any, 'animate');
        player.cameraFollow(secondPlayer, {
            smoothMove: {
                time: 3000,
                ease: 'easeInOutCubic'
            }
        })
        expect(spy).toHaveBeenCalledWith(
            expect.objectContaining({ 
                position: { x: expect.any(Number), y: expect.any(Number) },
                time: 3000,
                ease: 'easeInOutCubic'
            })
        )
    })

    test('viewport applied twice', () => {
        const viewport = client.getScene<RpgSceneMap>()?.viewport as any
        const spy = jest.spyOn(viewport as any, 'follow');
        player.cameraFollow(secondPlayer)
        secondClient.socket.disconnect()
        expect(spy).toHaveBeenCalledTimes(2)
    })
})

afterEach(() => {
    clear()
})