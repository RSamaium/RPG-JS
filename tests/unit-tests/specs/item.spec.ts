import { Potion, Key } from './fixtures/item'
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'
import { Item } from '@rpgjs/database'
import { RpgPlayer, RpgMap, MapData } from '@rpgjs/server'
import { beforeEach, test, afterEach, expect, describe, vi } from 'vitest'

let client, fixture, playerId, server
let player: RpgPlayer

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
})

test('add an item', () => {
    return new Promise(async (resolve: any) => {
        player.addItem(Potion)
        const { item, nb } = player.getItem(Potion)

        expect(item.name).toBe('Potion')
        expect(nb).toBe(1)

        await server.send()

        client.objects.subscribe((objects) => {
            const player: any = Object.values(objects)[0]
            expect(player.object.items).toBeDefined()
            expect(player.object.items[0]).toMatchObject({
                nb: 1,
                item: {
                    name: 'Potion',
                    price: 100,
                    id: 'potion'
                }
            }
            )
            resolve()
        })
    })
})

test('add an item', () => {
    player.addItem(Potion)
    const { item, nb } = player.getItem(Potion)
    expect(item.name).toBe('Potion')
    expect(nb).toBe(1)
})

test('add many item', () => {
    player.addItem(Potion, 5)
    player.addItem(Potion, 10)
    const { item, nb } = player.getItem(Potion)
    expect(item.name).toBe('Potion')
    expect(nb).toBe(15)
})

test('use item', () => {
    player.addItem(Potion)
    player.useItem(Potion)
    const ret = player.getItem(Potion)
    expect(ret).toBeUndefined()
})

test('use an item that is not in the inventory', () => {
    expect(() => {
        player.useItem(Potion)
    }).toThrowError(
        expect.objectContaining({
            id: 'ITEM_NOT_INVENTORY'
        })
    )
})

test('use an item that is not consumable', () => {
    expect(() => {
        player.addItem(Key)
        player.useItem(Key)
    }).toThrowError(
        expect.objectContaining({
            id: 'NOT_USE_ITEM'
        })
    )
})

test('buy an item', () => {
    player.gold += 200
    player.buyItem(Potion)
    const { item, nb } = player.getItem(Potion)
    expect(item.name).toBe('Potion')
    expect(nb).toBe(1)
    expect(player.gold).toBe(100)
})

test('buy multi item', () => {
    player.gold += 600
    player.buyItem(Potion, 3)
    const { item, nb } = player.getItem(Potion)
    expect(item.name).toBe('Potion')
    expect(nb).toBe(3)
    expect(player.gold).toBe(300)
})

test('buy an item but not gold :)', () => {
    expect(() => {
        player.buyItem(Potion)
    }).toThrowError(
        expect.objectContaining({
            id: 'NOT_ENOUGH_GOLD'
        })
    )
})

test('buy an item but not saleable', () => {
    expect(() => {
        player.buyItem(Key)
    }).toThrowError(
        expect.objectContaining({
            id: 'NOT_PRICE'
        })
    )
})

test('sell an item', () => {
    player.addItem(Potion)
    player.sellItem(Potion)
    expect(player.gold).toBe(50)
    const ret = player.getItem(Potion)
    expect(ret).toBeUndefined()
})

test('sell an item not in the inventory', () => {
    expect(() => {
        player.sellItem(Potion)
    }).toThrowError(
        expect.objectContaining({
            id: 'ITEM_NOT_INVENTORY'
        })
    )
})

test('Sell more items than inventory', () => {
    expect(() => {
        player.addItem(Potion, 5)
        player.sellItem(Potion, 10)
    }).toThrowError(
        expect.objectContaining({
            id: 'TOO_MANY_ITEM_TO_SELL'
        })
    )
})

test('to equip a classic object', () => {
    expect(() => {
        player.addItem(Potion)
        player.equip(Potion)
    }).toThrowError(
        expect.objectContaining({
            id: 'INVALID_ITEM_TO_EQUIP'
        })
    )
})

describe('Item class Hooks', () => {
    let potion

    beforeEach(() => {
        @Item({
            name: 'Potion',
            price: 100,
            hpValue: 100
        })
        class Potion {
            onUse = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            });

            onAdd = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            });

            onRemove = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            });

            onUseFailed = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            })
        }
        potion = Potion
    })

    test('onUse', () => {
        const { item } = player.addItem(potion)
        player.useItem(potion)
        expect(item.onUse).toHaveBeenCalled()
        expect(item.onUseFailed).not.toHaveBeenCalled()
    })

    test('onAdd', () => {
        const { item } = player.addItem(potion)
        expect(item.onAdd).toHaveBeenCalled()
    })

    test('onRemove', () => {
        const { item } = player.addItem(potion)
        player.removeItem(potion)
        expect(item.onRemove).toHaveBeenCalled()
    })

    test('onUseFailed', () => {
        @Item({
            name: 'Potion',
            price: 100,
            hpValue: 100,
            hitRate: 0
        })
        class Potion {
            onUse = vi.fn((player: RpgPlayer) => { });
            onUseFailed = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            })
        }
        potion = Potion
        const { item } = player.addItem(potion)
        expect(() => {
            player.useItem(potion)
        }).toThrowError()
        expect(item.onUse).not.toHaveBeenCalled()
        expect(item.onUseFailed).toHaveBeenCalled()
    })
})

afterEach(() => {
    clear()
})