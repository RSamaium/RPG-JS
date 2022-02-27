import {_beforeEach} from './beforeEach'
import { RpgPlayer } from '@rpgjs/server'
import { RpgClientEngine } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'

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

test('player.graphic() test', () => {
    return new Promise((resolve: any) => {
        player.setGraphic('mygraphic')
        resolve()
    })
})


afterEach(() => {
    clear()
})