import { _beforeEach } from './beforeEach'
import { RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { RpgCommonPlayer } from '@rpgjs/common'
import { RpgClientEngine, RpgSceneMap, RpgComponent, Spritesheet, RpgSprite } from '@rpgjs/client'
import { Components } from '@rpgjs/server'
import { clear, nextTick } from '@rpgjs/testing'

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
        const layout = component.getLayoutContainer(position).getChildAt(0) as any
        if (position === 'center') {
            return { layout, comp: layout }
        }
        return { layout, comp: layout.getChildAt(0) }
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
                switch (position) {
                    case 'center':
                        expect(layout.x).toBe(0)
                        expect(layout.y).toBe(0)
                        break;
                    case 'left':
                        expect(layout.x).toBe(-width)
                        expect(layout.y).toBe(0)
                        break;
                    case 'right':
                        expect(layout.x).toBe(playerClient.width)
                        expect(layout.y).toBe(0)
                        break;
                    case 'top':
                        expect(layout.x).toBe(0)
                        expect(layout.y).toBe(-height)
                        break;
                    case 'bottom':
                        expect(layout.x).toBe(0)
                        expect(layout.y).toBe(playerClient.height)
                        break;

                }
            }

            test('[One line] Position of layout', async () => {
                await expectPosition(position, [
                    Components.color('#ffffff'),
                ], 32, 32)
            })

            test('[Two line] Position of layout', async () => {
                await expectPosition(position, [
                    Components.color('#ffffff'),
                    Components.color('#ffffff'),
                ], 32, 64)
            })

            test('Color', async () => {
                player[playerSetComponentsMethod]([Components.color('#ffffff')])
                const { comp } = await getComponent(position)
                expect(comp.color).toBe('#ffffff')
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
                expect(comp.getChildAt(0).text).toBe(''+player.hp)
            })

            test('[Change Variable] Parse Variable in Text. {} format', async () => {
                const initialHp = player.hp
                player[playerSetComponentsMethod]([Components.text('{hp}')])
                const { comp } = await getComponent(position)
                player.hp -= 10
                await nextTick(client)
                const text = comp.getChildAt(0).text
                expect(text).not.toBe(''+initialHp)
                expect(text).toBe(''+player.hp)
            })

            test('Tile', async () => {
                player[playerSetComponentsMethod]([Components.tile(1)])
                const { comp } = await getComponent(position)
                expect(comp.getChildAt(0)).toHaveProperty('tile', { gid: 1 })
            })

            test('Change Layout', async () => {
                player[playerSetComponentsMethod]([Components.color('#ffffff')])
                await getComponent(position)
                player[playerSetComponentsMethod]([Components.image('test.png')])
                const { comp } =  await getComponent(position)
                expect(comp['source']).toBe('test.png')
            })
        })
    }
})

afterEach(() => {
    clear()
})