import { RpgServer, RpgModule, RpgPlugin, RpgPlayer } from '@rpgjs/server'
import { Potion } from './fixtures/item'
import { Sword } from './fixtures/weapons'
import { Confuse } from './fixtures/state'
import { Fire } from './fixtures/skill'
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe, vi } from 'vitest'

let client, player: RpgPlayer, fixture, playerId

@RpgModule<RpgServer>({
    database: {
        Potion,
        Sword,
        Confuse,
        Fire
    }
})
class RpgServerModule { }

const modules = [
    {
        server: RpgServerModule
    }
]

beforeEach(async () => {
    const ret = await _beforeEach(modules)
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
})

test('Test Save', () => {
    player.addItem(Potion)
    player.setVariable('TEST', true)
    const json = player.save()
    const obj = JSON.parse(json)
    expect(obj.items).toMatchObject({ "0": { "item": { "id": "potion" }, "nb": 1 } })
    expect(obj.variables).toHaveLength(1)
})

test('Test Load', async () => {
    player.addItem(Potion)
    player.addItem(Sword)
    player.equip(Sword)
    player.addState(Confuse)
    player.learnSkill(Fire)
    player.setVariable('TEST', true)
    player.statesEfficiency = [{ rate: 1, state: Confuse }]
    const json = player.save()
    player.removeItem(Potion)
    player.equip(Sword, false)
    player.removeState(Confuse)
    player.forgetSkill(Fire)
    player.removeVariable('TEST')
    await player.load(json)
    expect(player).toHaveProperty('items.0.item.hpValue')
    expect(player).toHaveProperty('equipments.0.atk')
    expect(player).toHaveProperty('equipments.0.equipped')
    expect(player.equipments[0].equipped).toBeTruthy()
    expect(player).toHaveProperty('states.0.effects')
    expect(player).toHaveProperty('skills.0.power')
    expect(player.statesEfficiency[0]).toHaveProperty('rate', 1)
    expect(player.statesEfficiency[0].state).toHaveProperty('id', 'confuse')
    expect(player.getVariable('TEST')).toBe(true)
})

test('Use Skill, after load', async () => {
    player.learnSkill(Fire)
    const json = player.save()
    player.forgetSkill(Fire)
    await player.load(json)
    player.useSkill(Fire, player)
})

describe('After Load, Hook should not be called', () => {
    async function testSave(action: Function, containHook: string) {
        action(player)
        const json = player.save()

        const spy = vi.spyOn(RpgPlugin, 'emit')
        await player.load(json)

        for (let mock of spy.mock.calls) {
            expect(mock[0]).not.toEqual(containHook)
        }

        spy.mockClear()
        spy.mockRestore()
    }

    test('onLevelUp hook is ignored', async () => {
        await testSave(
            player => player.level = 5,
            'Server.onLevelUp'
        )
    })

    test('onDead hook is ignored', async () => {
        await testSave(
            player => player.hp = 0,
            'Server.onDead'
        )
    })
})

describe('Custom Save / Load', () => {
    test('Prop', async () => {
        clear()

        @RpgModule<RpgServer>({
            player: {
                props: {
                    wood: true
                }
            }
        })
        class RpgServerCustomModule { }

        const { player } = await _beforeEach([
            {
                server: RpgServerCustomModule
            }
        ])

        player.wood = 5

        const json = player.save()
        const obj = JSON.parse(json)
        expect(obj).toHaveProperty('wood', 5)

        player.wood = 15

        player.load(json)
        expect(player.wood).toBe(5)
    })
})


afterEach(() => {
    clear()
})