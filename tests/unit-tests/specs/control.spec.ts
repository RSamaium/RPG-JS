import {_beforeEach} from './beforeEach'
import { EventData, Input, RpgEvent, RpgMap, RpgModule, RpgPlayer, RpgServer, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, Control } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { inputs } from './fixtures/control'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server: RpgServerEngine, 
map: RpgMap,
sceneMap: RpgSceneMap,
side: string

let modules = []

@RpgModule<RpgServer>({
    player:
})
class RpgServerModule {}

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
    map = player.getCurrentMap() as RpgMap
    sceneMap = client.scene
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

test('Apply Custom Controls (Server Side)', () => {
    // TODO
 })

afterEach(() => {
    clear()
})