import {_beforeEach} from './beforeEach'
import { RpgPlayer } from '@rpgjs/server'
import { RpgClientEngine } from '@rpgjs/client'
import { clear, nextTick } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, vi } from 'vitest'

let  client: RpgClientEngine, 
player: RpgPlayer

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
})

test('player.emit() test', () => {
    return new Promise((resolve: any) => {
        client.socket.on('test', (val) => {
            expect(val).toBe('foo')
            resolve()
        })
        player.emit('test', 'foo')
    })
})

test('player.on() test', () => {
    return new Promise((resolve: any) => {
        player.on('test', (val) => {
            expect(val).toBe('foo')
            resolve()
        })
        client.socket.emit('test', 'foo')
    })
})

test('player.once() test', () => {
    return new Promise((resolve: any) => {
        let i = 0
        player.once('test', (val) => {
            i++
        })
        player.once('test', (val) => {
            expect(i).toBe(0)
            resolve()
        })
        client.socket.emit('test', 'foo')
    })
})

test('player.off() test', () => {
    const fn  = vi.fn()
    player.on('test', fn)
    player.off('test')
    client.socket.emit('test', 'foo')
    expect(fn).toHaveBeenCalledTimes(0)
})

afterEach(() => {
    clear()
})