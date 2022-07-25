import {_beforeEach} from './beforeEach'
import { RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { RpgCommonPlayer } from '@rpgjs/common'
import { RpgClientEngine, RpgSceneMap, RpgComponent } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'

let  client: RpgClientEngine, 
player: RpgPlayer,
server: RpgServerEngine

let objects: any
let component: RpgComponent

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    server = ret.server
})

beforeEach(() => {
    const map = client.getScene<RpgSceneMap>()
    objects = map?.['objects'] as any
    component = Array.from(objects, ([name, value]) => value)[0]
})

test('Get Components', async () => {
    expect(objects?.size).toBe(1)
    expect(component).toBeInstanceOf(RpgComponent)
})

test('Get Type [isPlayer]', () => {
    expect(component.isPlayer).toBe(true)
})

test('Get Type [isShape]', () => {
    expect(component.isShape).toBe(false)
})

test('Get Logic', () => {
    expect(component.logic).toBeInstanceOf(RpgCommonPlayer)
})

test('isCurrentPlayer()', () => {
    expect(component.isCurrentPlayer).toBe(true)
})

test('Get Scene', () => {
    expect(component.getScene()).toBeInstanceOf(RpgSceneMap)
})

test('getPositionsOfGraphic()', () => {
   console.log(component.getPositionsOfGraphic())
})

afterEach(() => {
    clear()
})