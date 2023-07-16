import { afterEach, beforeEach, describe, expect, test, vitest } from 'vitest'
import { RpgPlayer, Presets } from '@rpgjs/server'
import { Effect } from '@rpgjs/database'
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'

const { MAXHP, MAXSP } = Presets

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

describe('applyEffect', () => {
    let initialHp, initialSp, item

    beforeEach(() => {
        item = { hpValue: 10, spValue: 5, hpRate: 0.1, spRate: 0.05 }
        initialHp = player.hp = 0
        initialSp = player.sp = 0
        player.applyEffect(item)
    })

    test('HP', () => {
        expect(player.hp).toBe(initialHp + item.hpValue + player.param[MAXHP] * item.hpRate)
    })

    test('SP', () => {
        expect(player.sp).toBe(initialSp + item.spValue + player.param[MAXSP] * item.spRate)
    })
})

test('hasEffect', () => {
    player.effects = [Effect.CAN_NOT_SKILL]
    expect(player.hasEffect(Effect.CAN_NOT_SKILL)).toBe(true)
    expect(player.hasEffect(Effect.PHARMACOLOGY)).toBe(false)
})

test('get effects', () => {
    player.effects = [Effect.CAN_NOT_SKILL]
    const effects = player.effects
    expect(effects).toContain(Effect.CAN_NOT_SKILL)
})

test('set effects', () => {
    player.effects = [Effect.CAN_NOT_SKILL]
    expect(player.effects).toEqual([Effect.CAN_NOT_SKILL])
})

afterEach(() => {
    clear()
})