import {_beforeEach} from './beforeEach'
import { EventData, Input, RpgEvent, RpgMap, RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, Control } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { inputs } from './fixtures/control'

let  client: RpgClientEngine, 
player: RpgPlayer, 
fixture, 
playerId, 
server: RpgServerEngine, 
map: RpgMap,
sceneMap: RpgSceneMap,
side: string

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
    map = player.getCurrentMap() as RpgMap
    sceneMap = client.scene
})

test('Create Dynamic Event', () => {
    @EventData({
        name: 'test'
    })
    class MyEvent extends RpgEvent {}
    const events = map.createDynamicEvent({
        x: 100,
        y: 200,
        event: MyEvent
    })
    expect(events).toBeDefined()
    expect(Object.values(map.events)).toHaveLength(1)
    const eventId = Object.keys(events)[0]

    server.send()

    return new Promise((resolve: any) => {
        client.objects.subscribe((objects) => {
            const events: any = Object.values(objects)
            const event = events.find(ev => ev.object.id == eventId)
            expect(event).toBeDefined()
            expect(event.object.position.x).toEqual(100)
            expect(event.object.position.y).toEqual(200)
            resolve()
        })
    })
})

test('Remove Event', () => {
    @EventData({
        name: 'test'
    })
    class MyEvent extends RpgEvent {}
    const events = map.createDynamicEvent({
        x: 100,
        y: 200,
        event: MyEvent
    })
    const eventId = Object.keys(events)[0]

    server.send()

    const bool = map.removeEvent(eventId)
    expect(bool).toBeTruthy()

    server.send()
    
    return new Promise((resolve: any) => {
        client.objects.subscribe((objects) => {
            const events: any = Object.values(objects)
            const event = events.find(ev => ev.object.id == eventId)
            expect(event).toBeUndefined()
            resolve()
        })
    })
})

test('Test onInit Hook', () => {
   return new Promise((resolve: any) => {
        @EventData({
            name: 'test'
        })
        class MyEvent extends RpgEvent {
            onInit(player: RpgPlayer) {
                expect(this).toBeDefined()
                expect(player).toBeUndefined()
                resolve()
            }
        }
        map.createDynamicEvent({
            x: 100,
            y: 200,
            event: MyEvent
        })
   })
})

test('Test onInit Hook [Scenario Mode]', () => {
    return new Promise((resolve: any) => {
         @EventData({
             name: 'test'
         })
         class MyEvent extends RpgEvent {
             onInit(_player: RpgPlayer) {
                 expect(_player).toBeDefined()
                 expect(_player.id).toEqual(player.id)
                 resolve()
             }
         }
         player.createDynamicEvent({
             x: 100,
             y: 200,
             event: MyEvent
         })
    })
 })

test('Test onAction', () => {
    return new Promise((resolve: any) => {
         @EventData({
             name: 'test'
         })
         class MyEvent extends RpgEvent {
             onAction(_player: RpgPlayer) {
                expect(_player).toBeDefined()
                expect(_player.id).toEqual(player.id)
                resolve()
             }
         }
         player.createDynamicEvent({
             x: 100,
             y: 200,
             event: MyEvent
         })
         player.teleport({ x: 100, y: 200 })
         client.controls.setInputs({
            [Control.Action]: {
                bind: [Input.Enter]
            }
         })
         client.controls.applyControl(Control.Action)
    })
 })

test('Test onChanges Hook [syncChanges method)', () => {
    return new Promise((resolve: any) => {
         @EventData({
             name: 'test'
         })
         class MyEvent extends RpgEvent {
             onChanges(player: RpgPlayer) {
                 resolve()
             }
         }
         player.createDynamicEvent({
             x: 100,
             y: 200,
             event: MyEvent
         })
         player.syncChanges()
    })
 })

/* test('Test onChanges Hook [after method)', () => {
    return new Promise((resolve: any) => {
         @EventData({
             name: 'test'
         })
         class MyEvent extends RpgEvent {
             onChanges(player: RpgPlayer) {
                 resolve()
             }
         }
         player.createDynamicEvent({
             x: 100,
             y: 200,
             event: MyEvent
         })
         player.syncChanges()
    })
 })*/

afterEach(() => {
    clear()
})