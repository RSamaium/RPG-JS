import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'
import { Weapon } from '@rpgjs/database'
import { RpgPlayer } from '@rpgjs/server'
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

@Weapon({
    id: 'weapon',
    name: 'Weapon',
    atk: 100,
})
class FireWeapon { }

@Weapon({
    id: 'ice',
    name: 'Ice Weapon',
    atk: 200,
})
class IceWeapon { }

describe('Weapon', () => {
    test('Player ATK', () => {
        player.addItem(FireWeapon)
        player.equip(FireWeapon)
        expect(player.atk).toBe(100)
    })
})

describe('Multi Weapon', () => {
    test('Player ATK', () => {
        player.addItem(FireWeapon)
        player.addItem(IceWeapon)
        player.equip(FireWeapon)
        player.equip(IceWeapon)
        expect(player.atk).toBe(300)
    })
})

afterEach(() => {
    clear()
})