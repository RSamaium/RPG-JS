import { afterEach, beforeEach, describe, expect, test, vitest } from 'vitest'
import { RpgPlayer, Presets, EventData, RpgEvent } from '@rpgjs/server'
import { Armor, Class, Weapon } from '@rpgjs/database'
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'

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

enum Elements {
    Fire = 'fire',
    Ice = 'ice'
}

test('elementsDefense getter', () => {
    @Armor({
        id: 'shield',
        name: 'Shield',
        elementsDefense: [{ rate: 1, element: Elements.Fire }]
    })
    class Shield { }
    player.addItem(Shield)
    player.equip(Shield)
    expect(player.elementsDefense).toEqual([{ rate: 1, element: Elements.Fire }])
})

test('elementsEfficiency getter and setter', () => {
    @Class({
        id: 'fighter',
        name: 'Fighter',
        elementsEfficiency: [{ rate: 1, element: Elements.Fire }]
    })
    class Fighter { }
    player.setClass(Fighter)
    expect(player.elementsEfficiency).toEqual([{ rate: 1, element: Elements.Fire }])

    player.elementsEfficiency = [{ rate: 2, element: Elements.Ice }]
    expect(player.elementsEfficiency).toEqual([{ rate: 2, element: Elements.Ice }, { rate: 1, element: Elements.Fire }])
})

test('elements getter', () => {
    @Armor({
        id: 'shieldice',
        name: 'IceShield',
        elements: [Elements.Ice]
    })
    class IceShield { }
    player.addItem(IceShield)
    player.equip(IceShield)
    expect(player.elements).toEqual([{
        element: Elements.Ice,
        rate: 1
    }])
})

describe('coefficientElements', () => {
    let event: RpgEvent, mockedDamageFormulas
    beforeEach(() => {
        @Class({
            id: 'fighter',
            name: 'Fighter',
            elementsEfficiency: [{ rate: 1, element: Elements.Fire }]
        })
        class Fighter { }

        @Armor({
            id: 'shieldice',
            name: 'IceShield',
            elementsDefense: [{ rate: 0.5, element: Elements.Ice }]
        })
        class IceShield { }

        @Weapon({
            id: 'fireweapon',
            name: 'FireWeapon',
            elements: [Elements.Fire]
        })
        class FireWeapon { }

        @EventData({
            name: 'test'
        })
        class MyEvent extends RpgEvent { }

        player.setClass(Fighter)
        player.addItem(IceShield)
        player.equip(IceShield)

        mockedDamageFormulas = {
            coefficientElements: vitest.fn()
        }
        
        const map = player.getCurrentMap()
        map?.createDynamicEvent({
            x: 100,
            y: 200,
            event: MyEvent
        })
        event = map?.getEventByName('test') as RpgEvent
        event.addItem(FireWeapon)
        event.equip(FireWeapon)

        player.server.damageFormulas = mockedDamageFormulas
        mockedDamageFormulas.coefficientElements.mockReturnValue(0.5)
    })

    test('coefficientElements formula called', () => {
        player.coefficientElements(event)
        expect(mockedDamageFormulas.coefficientElements).toHaveBeenCalled()
    })

    test('coefficientElements formula called', () => {
        const coef = player.coefficientElements(event)
        expect(coef).toBe(1.5)
    })
})

afterEach(() => {
    clear()
})