import {_beforeEach} from './beforeEach'
import { RpgModule, RpgPlayer } from '@rpgjs/server'
import { RpgClientEngine, RpgClient, RpgGui } from '@rpgjs/client'
import {render, fireEvent} from '@testing-library/vue'
import { clear } from '@rpgjs/testing'
import menuGui from './fixtures/gui/menu.vue'

let  client: RpgClientEngine, 
player: RpgPlayer

const GUI_NAME = 'my-hud'

@RpgModule<RpgClient>({
    gui: [
        menuGui
    ]
})
class RpgClientModule {}

beforeEach(async () => {
    const ret = await _beforeEach([{
        client: RpgClientModule
    }])
    client = ret.client
    player = ret.player
})

test('Gui exist', () => {
    const exist = RpgGui.exists(GUI_NAME)
    expect(exist).toBeTruthy()
})

test('Open GUI (Server Side)', () => {
    player.gui(GUI_NAME).open()
    const gui = RpgGui.get(GUI_NAME)
    expect(gui.display).toBeTruthy()
})

afterEach(() => {
    clear()
})