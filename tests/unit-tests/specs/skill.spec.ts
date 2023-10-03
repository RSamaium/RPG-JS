import { EventData, Presets, RpgEvent, RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { Fire, Ice } from './fixtures/skill';
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'
import { Effect, Skill } from '@rpgjs/database'
import { beforeEach, test, afterEach, expect, vi, describe } from 'vitest'
import { Confuse } from './fixtures/state';

let client, player: RpgPlayer, fixture, playerId, server: RpgServerEngine

const { INT } = Presets

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
    server = ret.server
    server.addInDatabase('fire', Fire)
    server.addInDatabase('ice', Ice)
})

test('getSkill - skill not found', () => {
    const skill = player.getSkill('fire')
    expect(skill).toBeNull()
})

test('getSkill - two skills, one learned, the other not. Do return null', () => {
    player.learnSkill('fire')
    const iceSkill = player.getSkill('ice')
    expect(iceSkill).toBeNull()
})

test('learnSkill - skill learned successfully', () => {
    const fireSkill = player.learnSkill('fire')
    expect(fireSkill).instanceOf(Fire)
})

test('learnSkill - add INT coefficient', () => {
    const fireSkill = player.learnSkill(Fire)
    expect(fireSkill).toHaveProperty('coefficient')
    expect(fireSkill.coefficient).toMatchObject({ [INT]: 1 })
})

test('getSkill - skill found', () => {
    player.learnSkill('fire')
    const fireSkill = player.getSkill('fire')
    expect(fireSkill).instanceOf(Fire)
})

test('forgetSkill - skill not learned', () => {
    expect(() => {
        player.forgetSkill(Fire)
    }).toThrowError(
        expect.objectContaining({
            id: 'SKILL_NOT_LEARNED'
        })
    )
})

test('forgetSkill - skill learned', () => {
    player.learnSkill(Fire)
    const fireSkill = player.forgetSkill(Fire)
    expect(fireSkill).instanceOf(Fire)

    const skill = player.getSkill(Fire)
    expect(skill).toBeNull()
})

test('useSkill - skill not learned', () => {
    expect(() => {
        player.useSkill('ice')
    }).toThrowError(
        expect.objectContaining({
            id: 'SKILL_NOT_LEARNED'
        })
    )
})

test('useSkill - not enough sp', () => {
    expect(() => {
        player.learnSkill(Fire)
        player.sp = 0
        player.useSkill(Fire)
    }).toThrowError(
        expect.objectContaining({
            id: 'NOT_ENOUGH_SP'
        })
    )
})

test('useSkill - effect can not skill', () => {
    expect(() => {
        player.learnSkill(Fire)
        player.effects = [Effect.CAN_NOT_SKILL]
        player.useSkill(Fire)
    }).toThrowError(
        expect.objectContaining({
            id: 'RESTRICTION_SKILL'
        })
    )
})

test('useSkill - avoid several times skill learned', () => {
    player.learnSkill('fire')
    expect(() => {
        player.learnSkill('fire')
    }).toThrowError(
        expect.objectContaining({
            id: 'SKILL_ALREADY_LEARNED'
        })
    )
})

test('useSkill - skill learned', () => {
    player.learnSkill('fire') // learning 'fire' skill
    const fireSkill = player.useSkill('fire') // using 'fire' skill
    expect(fireSkill).toBeTruthy()
})

test('useSkill - SP lost', () => {
    player.learnSkill(Fire)
    const initialSp = player.sp
    player.useSkill(Fire)
    expect(player.sp).toBe(initialSp - 75)
})

test('useSkill - SP lost (HALF_SP_COST effect)', () => {
    player.learnSkill(Fire)
    player.effects = [Effect.HALF_SP_COST]
    const initialSp = player.sp
    player.useSkill(Fire)
    expect(player.sp).toBe(initialSp - (75 / 2))
})

describe('useSkill with others players', () => {
    let event: RpgEvent
    beforeEach(() => {
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
        event.applyDamage = vi.fn()
        event.applyStates = vi.fn()
        player.learnSkill(Fire)
        player.useSkill(Fire, event)
    })

    test('apply damage', () => {
        expect(event.applyDamage).toHaveBeenCalled()
    })

    test('apply state', () => {
        expect(event.applyStates).toHaveBeenCalled()
        expect(event.getState(Confuse)).toBeDefined()
    })
})

describe('Skill class Hooks', () => {
    let skillInstance

    beforeEach(() => {
        @Skill({
            id: 'fire',
            name: 'Fire'
        })
        class Ice {
            onLearn = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            });

            onForget = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            });

            onUse = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            });

            onUseFailed = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            })
        }
        skillInstance = Ice
    })

    test('onLearn', () => {
        const skill = player.learnSkill(skillInstance)
        expect(skill.onLearn).toHaveBeenCalled()
    })

    test('onForget', () => {
        const skill = player.learnSkill(skillInstance)
        player.forgetSkill(skillInstance)
        expect(skill.onForget).toHaveBeenCalled()
    })

    test('onUse', () => {
        const skill = player.learnSkill(skillInstance)
        player.useSkill(skillInstance)
        expect(skill.onUse).toHaveBeenCalled()
        expect(skill.onUseFailed).not.toHaveBeenCalled()
    })

    test('onUseFailed', () => {
        @Skill({
            id: 'fire',
            name: 'Fire',
            hitRate: 0
        })
        class Ice {
            onUse = vi.fn((player: RpgPlayer) => { });
            onUseFailed = vi.fn((player: RpgPlayer) => {
                expect(player).toBeDefined()
            })
        }
        skillInstance = Ice
        const skill = player.learnSkill(skillInstance)
        expect(() => {
            player.useSkill(skillInstance)
        }).toThrowError()
        expect(skill.onUse).not.toHaveBeenCalled()
        expect(skill.onUseFailed).toHaveBeenCalled()
    })
})

afterEach(() => {
    clear()
})