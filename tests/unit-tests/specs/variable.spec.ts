import { RpgPlayer } from '@rpgjs/server'
import { _beforeEach } from './beforeEach'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect } from 'vitest'

let player: RpgPlayer

beforeEach(async () => {
    const ret = await _beforeEach()
    player = ret.player
})

test('variable set', () => {
    player.setVariable('FOO', 'bar')
    const val = player.getVariable('FOO')
    expect(val).toBe('bar')
})

test('variable remove', () => {
    player.setVariable('FOO', 'bar')
    player.removeVariable('FOO')
    const val = player.getVariable('FOO')
    expect(val).toBeUndefined()
})

test('change gold', () => {
    player.gold = 100
    expect(player.gold).toBe(100)
})

test('change negative gold', () => {
    player.gold = -100
    expect(player.gold).toBe(0)
})

afterEach(() => {
    clear()
})