import { _beforeEach } from './beforeEach'
import { RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { RpgCommonPlayer } from '@rpgjs/common'
import { RpgClientEngine, RpgSceneMap, RpgComponent, Spritesheet, RpgSprite } from '@rpgjs/client'
import { Components } from '@rpgjs/server'
import { clear, nextTick } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe } from 'vitest'

let client: RpgClientEngine,
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
        class Images { }

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

    // format of the components: [ { lines: [ { col: { id: 'graphic', value: 'mygraphic1' } } ] } ]

    const formatMockComponent = (component: any) => {
        if (!(component instanceof Array)) {
            component = [component]
        }
        return { lines: component.map(c => ({ col: [c] })) }
    }

    test('player.setGraphic() component', async () => {
        player.setGraphic('mygraphic1')
        await nextTick(client)
        const playerClient = client.gameEngine.getObject(player.id)?.object
        expect(playerClient.layout.center).toMatchObject(formatMockComponent({ id: 'graphic', value: 'mygraphic1' }))
    })

    test('player.setGraphic() multi component', async () => {
        player.setGraphic(['mygraphic1', 'mygraphic2'])
        await nextTick(client)
        const playerClient = client.gameEngine.getObject(player.id)?.object
        expect(playerClient.layout.center).toMatchObject(
            formatMockComponent([
                { id: 'graphic', value: 'mygraphic1' },
                { id: 'graphic', value: 'mygraphic2' }
            ])
        )
    })

    test('player.setGraphic(). The component is well applied on the client side', async () => {
        player.setGraphic(['mygraphic1', 'mygraphic2'])
        await nextTick(client)
        setComponent()
        expect(component['components'].center).toMatchObject(
            formatMockComponent([
                { id: 'graphic', value: 'mygraphic1' },
                { id: 'graphic', value: 'mygraphic2' }
            ])
        )
        expect(component.getLayoutContainer().children).toHaveLength(2)
    })

    async function getComponent(position): Promise<{ layout: any, comp: any }> {
        await nextTick(client)
        setComponent()
        const layout = component.getLayoutContainer(position) as any
        const child = layout.getChildAt(0)
        if (position === 'center') {
            return { layout, comp: child }
        }
        return { layout: child, comp: child.getChildAt(0) }
    }

    test('Graphic', async () => {
        player.setGraphic('mygraphic1')
        expect((await getComponent('center')).comp).toHaveProperty('setGraphic')
    })

    for (let position of ['center', 'left', 'right', 'top', 'bottom']) {
        describe(`[${position}] Test Component type`, () => {

            const playerSetComponentsMethod = 'setComponents' + position[0].toUpperCase() + position.slice(1)

            const expectPosition = async (position: string, components: any[], width: number, height: number) => {
                player[playerSetComponentsMethod](components)
                const { layout } = await getComponent(position)
                const playerClient = client.gameEngine.getObject(player.id)?.object
                const hitbox = player.hitbox
                switch (position) {
                    case 'center':
                        expect(layout.x).toBe(0)
                        expect(layout.y).toBe(0)
                        break;
                    case 'left':
                        expect(layout.x).toBe(-playerClient.width)
                        expect(layout.y).toBe(0)
                        break;
                    case 'right':
                        expect(layout.x).toBe(32)
                        expect(layout.y).toBe(0)
                        break;
                    case 'top':
                        expect(layout.x).toBe(0)
                        expect(layout.y).toBe(-height)
                        break;
                    case 'bottom':
                        expect(layout.x).toBe(0)
                        expect(layout.y).toBe(hitbox.h)
                        break;

                }
            }

            test('[One line] Position of layout', async () => {
                await expectPosition(position, [
                    Components.text('Hello'),
                ], 32, 20)
            })

            test('[Two line] Position of layout', async () => {
                await expectPosition(position, [
                    Components.text('Hello'),
                    Components.text('Hello'),
                ], 32, 40)
            })

            test('Shape', async () => {
                player[playerSetComponentsMethod]([Components.shape({
                    fill: '#ffffff',
                    type: 'circle',
                    radius: 10
                })])

                const { comp } = await getComponent(position)
                expect(comp.value.type).toBe('circle')
            })

            test('Image', async () => {
                player[playerSetComponentsMethod]([Components.image('test.png')])
                const { comp } = await getComponent(position)
                expect(comp['source']).toBe('test.png')
            })

            test('Text', async () => {
                player[playerSetComponentsMethod]([Components.text('hello')])
                const { comp } = await getComponent(position)
                expect(comp.getChildAt(0).text).toBe('hello')
            })

            test('[First Render] Parse Variable in Text. {} format', async () => {
                player[playerSetComponentsMethod]([Components.text('{hp}')])
                const { comp } = await getComponent(position)
                expect(comp.getChildAt(0).text).toBe('' + player.hp)
            })

            test('[Change Variable] Parse Variable in Text. {} format', async () => {
                const initialHp = player.hp
                player[playerSetComponentsMethod]([Components.text('{hp}')])
                const { comp } = await getComponent(position)
                player.hp -= 10
                await nextTick(client)
                const text = comp.getChildAt(0).text
                expect(text).not.toBe('' + initialHp)
                expect(text).toBe('' + player.hp)
            })

            test('Tile', async () => {
                player[playerSetComponentsMethod]([Components.tile(1)])
                const { comp } = await getComponent(position)
                expect(comp.getChildAt(0)).toHaveProperty('tile', { gid: 1 })
            })

            test('Change Layout', async () => {
                player[playerSetComponentsMethod]([Components.text('Hello')])
                await getComponent(position)
                player[playerSetComponentsMethod]([Components.image('test.png')])
                const { comp } = await getComponent(position)
                expect(comp['source']).toBe('test.png')
            })

            test('Remove Layout', async () => {
                player[playerSetComponentsMethod]([Components.text('Hello')])
                await getComponent(position)
                player.removeComponents(position as any)
                await nextTick(client)
                setComponent()
                const layout = component.getLayoutContainer(position as any) as any
                if (position === 'center') {
                    expect(layout.children.length).toBe(0)
                } else {
                    expect(layout.getChildAt(0).children.length).toBe(0)
                }
            })

            test('Remove Layout By Id', async () => {
                player[playerSetComponentsMethod](
                    [Components.text('Hello'), Components.hpBar()]
                )
                await getComponent(position)
                player.removeComponentById(position as any, 'text')
                await nextTick(client)
                setComponent()
                const layout = component.getLayoutContainer(position as any) as any
                if (position === 'center') {
                    expect(layout.children.length).toBe(1)
                }
                else {
                    expect(layout.getChildAt(0).children.length).toBe(1)
                }
            })

            test('Merge Component', async () => {
                player[playerSetComponentsMethod](
                    [Components.text('Hello')]
                )
                await getComponent(position)
                player.mergeComponent(position as any, Components.text('World'))
                const { layout } = await getComponent(position)
                expect(layout.children.length).toBe(2)
            })
        })
    }
})

describe('Test Built-in Component', () => {
    test('Component Text', () => {
        const text = Components.text('Hello')
        expect(text).toHaveProperty('id', 'text')
        expect(text).toHaveProperty('value')
        // test style by default, fill: #ffffff, fontSize: 15
        const style = (text.value as any).style
        expect(text.value).toHaveProperty('style')
        expect(style).toHaveProperty('fill', '#ffffff')
        expect(style).toHaveProperty('fontSize', 15)
    })

    test('Component Image', () => {
        const image = Components.image('test.png')
        expect(image).toHaveProperty('id', 'image')
        expect(image).toHaveProperty('value')
        expect(image.value).toBe('test.png')
    })

    test('Component Shape', () => {
        const shape = Components.shape({
            fill: '#ffffff',
            type: 'circle',
            radius: 10
        })
        expect(shape).toHaveProperty('id', 'shape')
        expect(shape).toHaveProperty('value')
        expect(shape.value).toHaveProperty('fill', '#ffffff')
        expect(shape.value).toHaveProperty('type', 'circle')
        expect(shape.value).toHaveProperty('radius', 10)
    })

    test('Component Tile', () => {
        const tile = Components.tile(1)
        expect(tile).toHaveProperty('id', 'tile')
        expect(tile).toHaveProperty('value')
        expect(tile.value).toBe(1)
    })

    test('Component HpBar', () => {
        const hpBar = Components.hpBar()
        expect(hpBar).toHaveProperty('id', 'bar')
        expect(hpBar).toHaveProperty('value')
        expect(hpBar.value).toHaveProperty('current', 'hp')
        expect(hpBar.value).toHaveProperty('max', 'param.maxHp')
        // default, fillColor: #ab0606
        const style = (hpBar.value as any).style
        expect(style).toHaveProperty('fillColor', '#ab0606')
    })

    test('Component SpBar', () => {
        const spBar = Components.spBar()
        expect(spBar).toHaveProperty('id', 'bar')
        expect(spBar).toHaveProperty('value')
        expect(spBar.value).toHaveProperty('current', 'sp')
        expect(spBar.value).toHaveProperty('max', 'param.maxSp')
        // default, fillColor: #ab0606
        const style = (spBar.value as any).style
        expect(style).toHaveProperty('fillColor', '#0fa38c')
    })

    test('Component generic bar', () => {
        const bar = Components.bar('hp', 'param.maxHp')
        expect(bar).toHaveProperty('id', 'bar')
        expect(bar).toHaveProperty('value')
        expect(bar.value).toHaveProperty('current', 'hp')
        expect(bar.value).toHaveProperty('max', 'param.maxHp')
    })

    test('Component generic bar, style', () => {
        const bar = Components.bar('hp', 'param.maxHp', {
            fillColor: '#ffffff',
            width: 100,
            height: 10,
            borderColor: '#000000',
            borderWidth: 1,
            borderRadius: 5
        })
        const style = (bar.value as any).style
        expect(style).toHaveProperty('fillColor', '#ffffff')
        expect(style).toHaveProperty('width', 100)
        expect(style).toHaveProperty('height', 10)
        expect(style).toHaveProperty('borderColor', '#000000')
        expect(style).toHaveProperty('borderWidth', 1)
        expect(style).toHaveProperty('borderRadius', 5)
    })

    test('Component generic bar, text above bar (default value)', () => {
        const bar = Components.bar('hp', 'param.maxHp', {})
        const text = (bar.value as any).text
        expect(text).toBe('{$current}/{$max}')
    })

    test('Component generic bar, text above bar not displayed', () => {
        const bar = Components.bar('hp', 'param.maxHp', {}, null)
        const text = (bar.value as any).text
        expect(text).toBe('')
    })

    test('Component generic bar, text above bar', () => {
        const bar = Components.bar('hp', 'param.maxHp', {}, 'HP: {$current}/{$max}')
        const text = (bar.value as any).text
        expect(text).toBe('HP: {$current}/{$max}')
    })
})

afterEach(() => {
    clear()
})