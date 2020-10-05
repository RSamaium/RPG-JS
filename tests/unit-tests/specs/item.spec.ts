import { Query } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'
import { Potion, Key } from './fixtures/item'
import { RPGServer } from './fixtures/server'

let  client, socket, player

beforeEach(() => {
    const fixture = testing(RPGServer)
    client = fixture.createClient()
    socket = client.connection()
    player = new Query().getPlayer(client)
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
    const ret = player.useItem(Potion)
    expect(ret.id).toBe('ITEM_NOT_INVENTORY')
})

test('use an item that is not consumable', () => {
    player.addItem(Key)
    const ret = player.useItem(Key)
    expect(ret.id).toBe('NOT_USE_ITEM')
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
    const ret = player.buyItem(Potion)
    expect(ret.id).toBe('NOT_ENOUGH_GOLD')
})

test('buy an item but not saleable', () => {
    const ret = player.buyItem(Key)
    expect(ret.id).toBe('NOT_PRICE')
})

test('sell an item', () => {
    player.addItem(Potion)
    player.sellItem(Potion)
    expect(player.gold).toBe(50)
    const ret = player.getItem(Potion)
    expect(ret).toBeUndefined()
})

test('sell an item not in the inventory', () => {
    const ret = player.sellItem(Potion)
    expect(ret.id).toBe('ITEM_NOT_INVENTORY')
})

test('Sell more items than inventory', () => {
    player.addItem(Potion, 5)
    const ret = player.sellItem(Potion, 10)
    expect(ret.id).toBe('TOO_MANY_ITEM_TO_SELL')
})

test('to equip a classic object', () => {
    player.addItem(Potion)
    const ret = player.equip(Potion)
    expect(ret.id).toBe('INVALID_ITEM_TO_EQUIP')
})