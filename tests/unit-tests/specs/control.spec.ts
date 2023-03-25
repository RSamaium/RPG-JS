import {_beforeEach} from './beforeEach'
import {  Input, RpgModule, RpgPlayer, RpgServer } from '@rpgjs/server'
import { RpgClientEngine, Control } from '@rpgjs/client'
import { clear, nextTick } from '@rpgjs/testing'
import { inputs } from './fixtures/control'
import { beforeEach, test, afterEach, expect, describe, vi } from 'vitest'

let  client: RpgClientEngine, 
player: RpgPlayer

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

        client.processInput()
   })
})

test('sendInput() client, is called', async () => {
    const spy = vi.spyOn(client, 'sendInput')
    client.controls.setInputs(inputs)
    client.controls.applyControl(Control.Right, true)
    client.processInput()
    expect(spy).toHaveBeenCalled()
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
        await client.processInput()
        await nextTick(client)
    })
})

test('Apply Controls - Move (Server Side)', () => {
    return new Promise(async (resolve: any) => {
        clear()

        @RpgModule<RpgServer>({
            player: {
                onInput(player: RpgPlayer, { input, moving }) {
                    expect(player).toBeDefined()
                    expect(+input).toEqual(Control.Right)
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

        await client.processInput()
        await nextTick(client) 
    })
})

test('Listen / Stop Controls', async () => {
    const fn = vi.fn()
    client.controls.setInputs({
        mycustom: {
            bind: Input.Enter,
            method: fn
        }
    })
    client.controls.applyControl('mycustom', true)
    client.controls.stopInputs()
    client.processInput()
    client.controls.applyControl('mycustom', false)
    client.controls.listenInputs()
    client.controls.applyControl('mycustom', true)
    client.processInput()
    client.controls.applyControl('mycustom', false)
    client.controls.applyControl('mycustom', true)
    client.processInput()
    client.controls.applyControl('mycustom', false)
    expect(fn).toHaveBeenCalledTimes(2)
})

test('Move', async () => {
    const fn = vi.fn()
    client.controls.setInputs({
        [Control.Right]: {
            bind: Input.Right,
            repeat: true,
            method: fn
        }
    })
    client.controls.applyControl(Control.Right, true)
    client.processInput()
    client.processInput()
    client.controls.applyControl(Control.Right, false)
    expect(fn).toHaveBeenCalledTimes(2)
})

test('Move but stop Inputs', async () => {
    const fn = vi.fn()
    client.controls.setInputs({
        [Control.Right]: {
            bind: Input.Right,
            repeat: true,
            method: fn
        }
    })
    client.controls.applyControl(Control.Right, true)
    client.processInput()
    client.controls.stopInputs()
    client.processInput()
    client.controls.applyControl(Control.Right, false)
    expect(fn).toHaveBeenCalledTimes(1)
})


describe('Delay Action', () => {
    function delayOtherControls(delay, calledTimes: number) {
        const spy = vi.spyOn(client.player as any, 'moveByDirection')
        client.controls.setInputs({
            [Control.Action]: {
                bind: Input.A,
                ...delay
            },
            [Control.Right]: {
                bind: Input.Right,
            }
        })
        client.controls.applyControl(Control.Action, true)
        client.processInput()
        client.controls.applyControl(Control.Action, false)
        client.controls.applyControl(Control.Right, true)
        client.processInput()
        expect(spy).toHaveBeenCalledTimes(calledTimes)
    }

    function delay(delay: number | undefined, calledTimes: number) {
        const spy = vi.spyOn(client.player as any, 'triggerCollisionWith')
        client.controls.setInputs({
            [Control.Action]: {
                bind: Input.A,
                delay
            }
        })
        client.controls.applyControl(Control.Action, true)
        client.processInput()
        client.controls.applyControl(Control.Action, false)
        client.controls.applyControl(Control.Action, true)
        client.processInput()
        expect(spy).toHaveBeenCalledTimes(calledTimes)
    }

    test('Not Delay Action', async () => {
        delay(undefined, 2)
    })

    test('Delay Action', async () => {
        delay(2000, 1)
    })

    test('Not Delay Action, other controls', async () => {
        delayOtherControls({}, 1)
    })

    test('Delay Action, other controls', async () => {
        delayOtherControls({
            delay: {
                duration: 2000,
                otherControls: [Control.Right]
            }
        }, 0)
    })
})

afterEach(() => {
    clear()
})