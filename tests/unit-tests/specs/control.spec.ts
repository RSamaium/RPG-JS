import {_beforeEach} from './beforeEach'
import { EventData, Input, RpgEvent, RpgMap, RpgModule, RpgPlayer, RpgServer, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, Control } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { inputs } from './fixtures/control'

let  client: RpgClientEngine, 
player: RpgPlayer

const wait = () => new Promise(resolve =>  setTimeout(resolve, 200))

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
})

test('Get Controls', () => {
    client.controls.setInputs({
        [Control.Action]: {
            bind: Input.Enter
        }
    })
    const control = client.controls.getControl(Input.Enter)
    expect(control?.actionName).toEqual(Control.Action)
    expect(control?.options.repeat).toEqual(false)
    expect(control?.options.bind).toEqual(Input.Enter)
})

test('Apply Custom Controls (Client Side)', () => {
   return new Promise((resolve: any) => {
        client.controls.setInputs({
            mycustom: {
                bind: Input.Enter,
                method(control) {
                    expect(control?.actionName).toEqual('mycustom')
                    resolve()
                }
            }
        })
        client.controls.applyControl('mycustom')
   })
})

test('Apply Controls - Action (Server Side)', () => {
    return new Promise(async (resolve: any) => {
        clear()

        @RpgModule<RpgServer>({
            player: {
                onInput(player: RpgPlayer, { input, moving }) {
                    expect(player).toBeDefined()
                    expect(input).toEqual(Control.Action)
                    expect(moving).toEqual(false)
                    resolve()
                }
            }
        })
        class RpgServerModule {}

        const { client } = await _beforeEach([{
            server: RpgServerModule
        }])

        client.controls.setInputs({
            [Control.Action]: {
                bind: Input.Enter
            }
        })

        client.controls.applyControl(Control.Action)
    })
})

test('Apply Controls - Move (Server Side)', () => {
    return new Promise(async (resolve: any) => {
        clear()

        @RpgModule<RpgServer>({
            player: {
                onInput(player: RpgPlayer, { input, moving }) {
                    expect(player).toBeDefined()
                    expect(input).toEqual(Control.Right)
                    expect(moving).toEqual(true)
                    resolve()
                }
            }
        })
        class RpgServerModule {}

        const { client } = await _beforeEach([{
            server: RpgServerModule
        }])

        client.controls.setInputs(inputs)
        client.controls.applyControl(Control.Right, true)
    })
})

test('Listen / Stop Controls', async () => {
    const fn = jest.fn()
    client.controls.setInputs({
        mycustom: {
            bind: Input.Enter,
            method: fn
        }
    })
    await client.controls.applyControl('mycustom')
    client.controls.stopInputs()
    await client.controls.applyControl('mycustom')
    client.controls.listenInputs()
    await client.controls.applyControl('mycustom')
    expect(fn).toHaveBeenCalledTimes(2)
})

afterEach(() => {
    clear()
})