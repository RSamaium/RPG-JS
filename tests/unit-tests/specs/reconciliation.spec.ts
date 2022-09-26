import {_beforeEach} from './beforeEach'
import { RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, Control, RpgPlugin, HookClient } from '@rpgjs/client'
import { clear, nextTick } from '@rpgjs/testing'
import { inputs } from './fixtures/control'

let  client: RpgClientEngine, 
player: RpgPlayer,
server: RpgServerEngine

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    server = ret.server
})


test('Test reconciliation', async () => {
   return new Promise(async (resolve: any) => {
        RpgPlugin.on(HookClient.SendInput, async (client, name) => {
            await server['updatePlayersMove'](1)
            server.send()
            const pos = { x: 3, y: 0, z: 0 }
            expect(player.position).toMatchObject(pos)
            const { serverFrames, clientFrames } = client
            const frame = 2
            expect(serverFrames.size).toBe(1)
            expect(clientFrames.size).toBe(1)
            expect(serverFrames.get(frame).data).toMatchObject(clientFrames.get(frame).data)
            resolve()
        })  
        client.controls.setInputs(inputs)
        client.controls.applyControl(Control.Right)
        client.processInput()
        client.nextFrame(0)
   })
})


test('Multi input', async () => {
    return new Promise(async (resolve: any) => {
        RpgPlugin.on(HookClient.SendInput, async (client, name) => {
            await server['updatePlayersMove'](1)
            server.send()
            const frame = 2
            const { serverFrames, clientFrames } = client
            expect(serverFrames.get(frame).data).toMatchObject(clientFrames.get(frame).data)
            resolve() 
        })  
        client.controls.setInputs(inputs)
        client.controls.applyControl(Control.Right, true)
        client.controls.applyControl(Control.Down, true)
        client.processInput()
        client.nextFrame(0)
    })
 })

afterEach(() => {
    clear()
})