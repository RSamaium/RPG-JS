import {_beforeEach} from './beforeEach'
import { RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { RpgCommonPlayer } from '@rpgjs/common'
import { RpgClientEngine, RpgSceneMap, RpgComponent, Spritesheet, RpgSprite } from '@rpgjs/client'
import { ColorComponent } from '@rpgjs/client/src/Components/ColorComponent'
import { clear, nextTick } from '@rpgjs/testing'

let  client: RpgClientEngine, 
player: RpgPlayer,
server: RpgServerEngine

let objects: any
let component: RpgComponent

function setComponent() {
    const map = client.getScene<RpgSceneMap>()
    objects = map?.['objects'] as any
    component = Array.from(objects, ([name, value]) => value)[0]
}

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    server = ret.server
})

beforeEach(() => {
    setComponent()
})

test('Get Components', async () => {
    expect(objects?.size).toBe(1)
    expect(component).toBeInstanceOf(RpgComponent)
})

test('Get Type [isPlayer]', () => {
    expect(component.isPlayer).toBe(true)
})

test('Get Type [isShape]', () => {
    expect(component.isShape).toBe(false)
})

test('Get Logic', () => {
    expect(component.logic).toBeInstanceOf(RpgCommonPlayer)
})

test('isCurrentPlayer()', () => {
    expect(component.isCurrentPlayer).toBe(true)
})

test('Get Scene', () => {
    expect(component.getScene()).toBeInstanceOf(RpgSceneMap)
})

describe('Graphic Component', () => {
    beforeEach(async () => {
        clear()
        
        const url = require('./fixtures/spritesheets/sample.png')

        @Spritesheet({
            images: {
                mygraphic1: url,
                mygraphic2: url
            }
        })
        class Images {}

        const ret = await _beforeEach([
            {
                client: {
                    spritesheets: [Images]
                }
            }
        ])
        client = ret.client
        player = ret.player
        server = ret.server
    })

    
    test('player.setGraphic() component', async () => {
        player.setGraphic('mygraphic1')
        await nextTick(client)
        const playerClient = client.gameEngine.getObject(player.id)?.object
        expect(playerClient.components).toMatchObject([{ id: 'graphic', value: 'mygraphic1' } ])
    })
    
    test('player.setGraphic() multi component', async () => {
        player.setGraphic(['mygraphic1', 'mygraphic2'])
        await nextTick(client)
        const playerClient = client.gameEngine.getObject(player.id)?.object
        expect(playerClient.components).toMatchObject(
            [
                { id: 'graphic', value: 'mygraphic1' },
                { id: 'graphic', value: 'mygraphic2' } 
            ]
        )
    })

    test('player.setGraphic(). The component is well applied on the client side', async () => {
        player.setGraphic(['mygraphic1', 'mygraphic2'])
        await nextTick(client)
        setComponent()
        expect(component['components']).toMatchObject(
            [
                { id: 'graphic', value: 'mygraphic1' },
                { id: 'graphic', value: 'mygraphic2' } 
            ]
        )
        expect(component.children).toHaveLength(2)
    })

    describe('Test Component type', () => {
        test('Graphic', async () => {
            player.setGraphic('mygraphic1')
            await nextTick(client)
            setComponent()
            const comp = component.getChildAt(0)
            expect(comp).toHaveProperty('setGraphic')
        })

        test('Color', async () => {
            player.components = [ { id: 'color', value: '#ffffff' } ]
            await nextTick(client)
            setComponent()
            const comp = component.getChildAt(0) as ColorComponent
            expect(comp).toHaveProperty('setBackgroundColor')
            expect(comp.color).toBe('#ffffff')
        })

        test('Image', async () => {
            player.components = [ { id: 'image', value: 'test.png' } ]
            await nextTick(client)
            setComponent()
            const comp = component.getChildAt(0)
            expect(comp).toHaveProperty('setImage')
            expect(comp['source']).toBe('test.png')
        })

        test('Text', async () => {
            player.components = [ { id: 'text', value: 'hello' } ]
            await nextTick(client)
            setComponent()
            const comp = component.getChildAt(0) as any
            expect(comp.text).toBe('hello')
        })

        test('Tile', async () => {
            player.components = [ { id: 'tile', value: 1 } ]
            await nextTick(client)
            setComponent()
            const comp = component.getChildAt(0) as any
            expect(comp).toHaveProperty('setTile')
            expect(comp.getChildAt(0)).toHaveProperty('tile', { gid: 1 })
        })
    })
})

afterEach(() => {
    clear()
})