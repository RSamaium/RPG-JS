import { _beforeEach } from './beforeEach'
import { Move, RpgModule, RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, RpgClient, RpgGui } from '@rpgjs/client'
import { clear, nextTick, waitUntil } from '@rpgjs/testing'
import menuGui from './fixtures/gui/menu.vue'
import tooltipGui from './fixtures/gui/tooltip.vue'
import { beforeEach, test, afterEach, expect, vi } from 'vitest'

let client: RpgClientEngine,
    player: RpgPlayer,
    server: RpgServerEngine

const GUI_NAME = 'my-hud'
const TOOLTIP_NAME = 'tooltip'

@RpgModule<RpgClient>({
    gui: [
        menuGui,
        tooltipGui
    ]
})
class RpgClientModule { }

beforeEach(async () => {
    const ret = await _beforeEach([{
        client: RpgClientModule
    }])
    client = ret.client
    player = ret.player
    server = ret.server
})

test('Gui exist', () => {
    const exist = RpgGui.exists(GUI_NAME)
    expect(exist).toBeTruthy()
})

test('Open GUI (Client Side)', async () => {
    RpgGui.display(GUI_NAME)
    await client.vueInstance.$nextTick()
    const div = document.getElementById('bar')
    expect(div).toBeDefined()
})

test('Open GUI (Server Side)', () => {
    player.gui(GUI_NAME).open()
    const gui = RpgGui.get(GUI_NAME)
    expect(gui.display).toBeTruthy()
})

test('Get display Tooltip Component in a sprite', async () => {
    player.showAttachedGui()
    player.gui(TOOLTIP_NAME).open()
    const gui = RpgGui.get(TOOLTIP_NAME)
    expect(gui.display).toBeTruthy()
    await nextTick(client)
    const tooltips = document.getElementById('tooltips')?.children
    expect(tooltips?.length).toBe(1)
})

test('display Tooltip and move', async () => {
    player.showAttachedGui()
    player.gui(TOOLTIP_NAME).open()
    await nextTick(client)
    const tooltips1 = document.getElementById('tooltips')?.children
    expect(tooltips1?.length).toBe(1)
    await waitUntil(
        player.moveRoutes([Move.right()])
    )
    const tooltips2 = document.getElementById('tooltips')?.children
    expect(tooltips2?.length).toBe(1)
})

test('close Tooltip', async () => {
    player.showAttachedGui()
    player.gui(TOOLTIP_NAME).open()
    await nextTick(client)
    const tooltips1 = document.getElementById('tooltips')?.children
    expect(tooltips1?.length).toBe(1)
    player.hideAttachedGui()
    await nextTick(client)
    const tooltips2 = document.getElementById('tooltips')?.children
    expect(tooltips2?.length).toBe(0)
})

test('Get Vue App/Instance', async () => {
    clear()

    const onStart = vi.fn()

    @RpgModule<RpgClient>({
        engine: {
            onStart
        }
    })
    class RpgClientModule { }

    await _beforeEach([{
        client: RpgClientModule
    }])

    expect(onStart).toHaveBeenCalled()
    expect(onStart.mock.calls[0][0].vueApp).toBeDefined()
    expect(onStart.mock.calls[0][0].vueInstance).toBeDefined()
})

afterEach(() => {
    clear()
})