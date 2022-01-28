import { Potion, Key } from './fixtures/item'
import {_beforeEach} from './beforeEach'
import { clear } from '@rpgjs/testing'

let  client, player, fixture, playerId, server

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
})

test('add an item', () => {
    return new Promise((resolve: any) => {
        player.addItem(Potion)
        const { item, nb } = player.getItem(Potion)

        expect(item.name).toBe('Potion')
        expect(nb).toBe(1)

        server.send()

        client.objects.subscribe((objects) => {
            const player: any = Object.values(objects)[0]
            expect(player.object.items).toBeDefined()
            expect(player.object.items[0]).toMatchObject({
                nb: 1,
                item: {
                  name: 'Potion',
                  description: null,
                  price: 100,
                  consumable: null,
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
    try {
        player.useItem(Potion)
    }
    catch (err) {
        expect(err.id).toBe('ITEM_NOT_INVENTORY')
    }
})

test('use an item that is not consumable', () => {
    try {
        player.addItem(Key)
        player.useItem(Key)
    }
    catch (err) {
        expect(err.id).toBe('NOT_USE_ITEM')
    }
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
    try {
        player.buyItem(Potion)
    }
    catch (err) {
        expect(err.id).toBe('NOT_ENOUGH_GOLD')
    }
})

test('buy an item but not saleable', () => {
    try {
        player.buyItem(Key)
    }
    catch (err) {
        expect(err.id).toBe('NOT_PRICE')
    }
})

test('sell an item', () => {
    player.addItem(Potion)
    player.sellItem(Potion)
    expect(player.gold).toBe(50)
    const ret = player.getItem(Potion)
    expect(ret).toBeUndefined()
})

test('sell an item not in the inventory', () => {
    try {
        player.sellItem(Potion)
    }
    catch (err) {
        expect(err.id).toBe('ITEM_NOT_INVENTORY')
    }
})

test('Sell more items than inventory', () => {
    try {
        player.addItem(Potion, 5)
        player.sellItem(Potion, 10)
    }
    catch (err) {
        expect(err.id).toBe('TOO_MANY_ITEM_TO_SELL')
    }
})

test('to equip a classic object', () => {
    try {
        player.addItem(Potion)
        player.equip(Potion)
    }
    catch (err) {
        expect(err.id).toBe('INVALID_ITEM_TO_EQUIP')
    }
})

afterEach(() => {
    clear()
})