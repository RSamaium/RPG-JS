import { afterEach, beforeEach, describe, expect, test, vitest } from 'vitest'
import { EventData, RpgEvent, RpgPlayer } from '@rpgjs/server'
import { Effect, Weapon } from '@rpgjs/database'
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'

// Mocked server's damageFormulas
const mockedDamageFormulas = {
    damagePhysic: vitest.fn(),
    damageSkill: vitest.fn(),
    damageCritical: vitest.fn(),
    damageGuard: vitest.fn()
}

const DAMAGE = 100

let client, fixture, playerId, server, event: RpgEvent
let player: RpgPlayer

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId

    @EventData({
        name: 'test'
    })
    class MyEvent extends RpgEvent { }

    const map = player.getCurrentMap()
    map?.createDynamicEvent({
        x: 100,
        y: 200,
        event: MyEvent
    })
    event = map?.getEventByName('test') as RpgEvent
})

// tests
describe('BattleManager', () => {

    beforeEach(async () => {
        player.server.damageFormulas = mockedDamageFormulas
        mockedDamageFormulas.damagePhysic.mockReturnValue(DAMAGE)
        mockedDamageFormulas.damageCritical.mockReturnValue(DAMAGE)
    })

    test('damagePhysic formula is called', async () => {
        event.applyDamage(player)
        expect(mockedDamageFormulas.damagePhysic).toHaveBeenCalled()
        const params = {
            atk: 0,
            pdef: 0,
            sdef: 0,
            maxHp: 741,
            maxSp: 534,
            str: 67,
            int: 36,
            dex: 54,
            agi: 58
        }
        /*expect(mockedDamageFormulas.damagePhysic).toHaveBeenCalledWith(DAMAGE, 
            params,
            params
        )*/

    })

    test('damageCritical formula is called', async () => {
        event.applyDamage(player)
        expect(mockedDamageFormulas.damageCritical).toHaveBeenCalled()
        const params = {
            atk: 0,
            pdef: 0,
            sdef: 0,
            maxHp: 741,
            maxSp: 534,
            str: 67,
            int: 36,
            dex: 54,
            agi: 58
        }
        /*expect(mockedDamageFormulas.damagePhysic).toHaveBeenCalledWith(DAMAGE, 
            params,
            params
        )*/

    })

    test('applyDamage should return expected damage', async () => {
        const result = event.applyDamage(player)
        expect(result.damage).toBe(100)
    })

    test('applyDamage with skill should return expected damage', async () => {
        player.server.damageFormulas = mockedDamageFormulas
        mockedDamageFormulas.damageSkill.mockReturnValue(200)
        const result = event.applyDamage(player, {})
        expect(result.damage).toBe(200)
    })

    test('is not critical', async () => {
        const result = event.applyDamage(player)
        expect(result.critical).toBe(false)
    })

    test('applyDamage should calculate critical damage correctly', async () => {
        player.server.damageFormulas = mockedDamageFormulas
        mockedDamageFormulas.damagePhysic.mockReturnValue(100)
        mockedDamageFormulas.damageCritical.mockReturnValue(200)
        const result = event.applyDamage(player)
        expect(result.damage).toBe(200)
        expect(result.critical).toBe(true)
    })

    test('applyDamage should throw error when no Physic Formulas exist', async () => {
        player.server.damageFormulas = {}
        expect(() => event.applyDamage(player)).toThrow('Physic Formulas not exists')
    })

    test('applyDamage with skill should throw error when no Skill Formulas exist', async () => {
        player.server.damageFormulas = {}
        expect(() => event.applyDamage(player, {})).toThrow('Skill Formulas not exists')
    })

    test('applyDamage should calculate guarded damage correctly', async () => {
        player.server.damageFormulas = mockedDamageFormulas
        event.effects = [Effect.GUARD]
        mockedDamageFormulas.damageGuard.mockReturnValue(50)
        const result = event.applyDamage(player)
        expect(result.damage).toBe(50)
        expect(result.guard).toBe(true)
    })

    test('applyDamage should calculate super guarded damage correctly', async () => {
        event.effects = [Effect.SUPER_GUARD]
        const result = event.applyDamage(player)
        expect(result.damage).toBe(25)
        expect(result.superGuard).toBe(true)
    })

    afterEach(() => {
        vitest.clearAllMocks()
    })
})

test('Apply Damage with physic formula', () => {
    @Weapon({
        id: 'weapon',
        name: 'Weapon',
        atk: 100,
    })
    class FireWeapon { }
    player.addItem(FireWeapon)
    player.equip(FireWeapon)
    const initialHp = event.hp
    const result = event.applyDamage(player)
    expect(result.damage).toBe(435)
    expect(event.hp).toBe(initialHp - result.damage)
})

afterEach(() => {
    clear()
})