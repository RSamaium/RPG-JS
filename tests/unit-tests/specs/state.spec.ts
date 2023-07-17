import { Presets, RpgServerEngine} from '@rpgjs/server'
import { Confuse, HpPlus } from './fixtures/state';
import { State, Armor } from '@rpgjs/database'
import {_beforeEach} from './beforeEach'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect } from 'vitest'

const { MAXHP_CURVE, MAXSP_CURVE, MAXHP, ATK, PDEF, SDEF, MAXSP } = Presets

let  client, player, fixture, playerId, server: RpgServerEngine

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
    server = ret.server
    server.addInDatabase('confuse', Confuse)
})

test('add state', () => {
    player.addState(Confuse)
    expect(player.states).toHaveLength(1)
    expect(player).toHaveProperty('states.0.name')
})

test('get state', () => {
    player.addState(Confuse)
    const state = player.getState(Confuse)
    expect(state).toBeDefined()
    expect(state.name).toBe('Confuse')
})

test('get state by id', () => {
    player.addState(Confuse)
    const state = player.getState('confuse')
    expect(state).toBeDefined()
    expect(state.name).toBe('Confuse')
})

test('add state with not chance', () => {
    expect(() => player.addState(Confuse, 0)).toThrowError(
        expect.objectContaining({
            id: 'ADD_STATE_FAILED'
        })
    )
})

test('remove state', () => {
    player.addState(Confuse)
    expect(player.states).toHaveLength(1)
    player.removeState(Confuse)
    expect(player.states).toHaveLength(0)
})

test('remove state with not chance', () => {
    expect(() => {
        player.addState(Confuse)
        player.removeState(Confuse, 0)
    }).toThrowError(
        expect.objectContaining({
            id: 'REMOVE_STATE_FAILED'
        })
    )
})

test('remove state but state is not applied', () => {
    expect(() => {
        player.removeState(Confuse)
    }).toThrowError(
        expect.objectContaining({
            id: 'STATE_NOT_APPLIED'
        })
    )
})

test('Add a state does not influence statesEfficiency', () => {
    player.addState(Confuse)
    expect(player.statesEfficiency).toHaveLength(0)
})

test('[statesEfficiency] Add an effective state', () => {
    player.statesEfficiency = [{ rate: 1, state: Confuse }]
    expect(player.statesEfficiency).toHaveLength(1)
    expect(player.statesEfficiency[0]).toHaveProperty('state.name')
})

/*test('[statesEfficiency] Retrieves the highest rate and an uniq element ', () => {
    player.statesEfficiency = [{ rate: 1, state: Confuse }, { rate: 2, state: Confuse }]
    expect(player.statesEfficiency).toHaveLength(1)
})*/

test('State: Modifier params with static value', () => {
    const beforeMaxHp = player.param[MAXHP]
    player.addState(HpPlus)
    const afterMaxHp = player.param[MAXHP]
    expect(afterMaxHp).toBe(beforeMaxHp + 100)
})

test('State: Modifier params with rate', () => {
    @State({
        name: 'HP Plus',
        paramsModifier: {
            [MAXHP]: {
                rate: 2
            }
        }
    })
    class HpPlus { }

    const beforeMaxHp = player.param[MAXHP]
    player.addState(HpPlus)
    const afterMaxHp = player.param[MAXHP]
    expect(afterMaxHp).toBe(beforeMaxHp * 2)
})

test('State: Modifier params with rate and value', () => {
    @State({
        name: 'HP Plus',
        paramsModifier: {
            [MAXHP]: {
                rate: 2,
                value: 100
            }
        }
    })
    class HpPlus { }

    const beforeMaxHp = player.param[MAXHP]
    player.addState(HpPlus)
    const afterMaxHp = player.param[MAXHP]
    expect(afterMaxHp).toBe(beforeMaxHp * 2 + 100)
})

test('State: Several modifiers with rate and value', () => {
    
    @State({
        name: 'HP Plus',
        paramsModifier: {
            [MAXHP]: {
                rate: 2,
                value: 100
            }
        }
    })
    class HpPlus { }

    @State({
        name: 'HP Plus More',
        paramsModifier: {
            [MAXHP]: {
                rate: 3,
                value: 100
            }
        }
    })
    class HpPlusMore { }

    const beforeMaxHp = player.param[MAXHP]
    player.addState(HpPlus)
    player.addState(HpPlusMore)
    const afterMaxHp = player.param[MAXHP]
    expect(afterMaxHp).toBe(beforeMaxHp * 2.5 + 200)
})

test('the defense of a state', () => {
    @Armor({
        name: 'Shield',
        statesDefense: [Confuse]
    })
    class Shield {}

    player.addItem(Shield)
    player.equip(Shield)

    expect(player).toHaveProperty('statesDefense.0.rate', 1)
    expect(player).toHaveProperty('statesDefense.0.state')
})

test('If several armors with the same defense, takes the highest rate', () => {
    @Armor({
        name: 'Shield',
        statesDefense: [Confuse]
    })
    class Shield {}

    @Armor({
        name: 'ShieldPlus',
        statesDefense: [{ rate: 2, state: Confuse }]
    })
    class ShieldPlus {}

    player.addItem(Shield)
    player.equip(Shield)

    player.addItem(ShieldPlus)
    player.equip(ShieldPlus)

    expect(player.statesDefense).toHaveLength(1)
    expect(player).toHaveProperty('statesDefense.0.rate', 2)
})

afterEach(() => {
    clear()
})