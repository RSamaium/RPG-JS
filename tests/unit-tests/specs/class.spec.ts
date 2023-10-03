import { RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { Class, ClassCanEquip } from '@rpgjs/database'
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe } from 'vitest'
import { Fighter } from './fixtures/class'
import { Hero } from './fixtures/actor'
import { Sword } from './fixtures/weapons'

let player: RpgPlayer, server: RpgServerEngine

beforeEach(async () => {
    const ret = await _beforeEach()
    player = ret.player
    server = ret.server
    server.addInDatabase('fighter', Fighter)
    server.addInDatabase('hero', Hero)
})

test('setClass', () => {
    player.setClass(Fighter)
    expect(player._class).toBeInstanceOf(Fighter)
})

test('setClass (by id)', () => {
    player.setClass('fighter')
    expect(player._class).toBeInstanceOf(Fighter)
})

test('setActor', () => {
    const actor = player.setActor(Hero)
    expect(player.name).toBe(actor.name)
    expect(player.initialLevel).toBe(actor.initialLevel)
    expect(player.finalLevel).toBe(actor.finalLevel)
    expect(player.expCurve).toEqual(actor.expCurve)
    expect(player._class).toBeInstanceOf(Fighter)
})

test('setActor (by id)', () => {
    const actor = player.setActor('hero')
    expect(player.name).toBe(actor.name)
})

describe('canEquip', () => {
    test('Not Equip', () => {
        @Class({
            name: 'Fighter'
        })
        class CustomFighter implements ClassCanEquip {
            canEquip(item: any, player: RpgPlayer): boolean {
                return false
            }
        }
        server.addInDatabase('fighter', CustomFighter)
        player.setClass(CustomFighter)
        player.addItem(Sword)
        expect(() => player.equip(Sword)).toThrow()
    })

    test('Not Equip, get Item and Player', () => {
        return new Promise(async (resolve: any) => {
            @Class({
                name: 'Fighter'
            })
            class CustomFighter implements ClassCanEquip {
                canEquip(item: any, player: RpgPlayer): boolean {
                    expect(item).toBeInstanceOf(Sword)
                    expect(player).toBeInstanceOf(RpgPlayer)
                    resolve()
                    return true
                }
            }
            server.addInDatabase('fighter', CustomFighter)
            player.setClass(CustomFighter)
            player.addItem(Sword)
            player.equip(Sword)
        })
    })
})

afterEach(() => {
    clear()
})
