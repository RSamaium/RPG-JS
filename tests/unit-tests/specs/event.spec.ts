import { _beforeEach } from './beforeEach'
import { EventData, EventMode, Input, MapData, RpgEvent, RpgMap, RpgModule, RpgPlayer, RpgServer, RpgServerEngine } from '@rpgjs/server'
import { RpgClientEngine, RpgSceneMap, Control, RpgPlugin, HookClient } from '@rpgjs/client'
import { clear, nextTick } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe } from 'vitest'
import { createSprite } from './fixtures/animation'

let client: RpgClientEngine,
    player: RpgPlayer,
    fixture,
    playerId,
    server: RpgServerEngine,
    map: RpgMap,
    sceneMap: RpgSceneMap | null,
    side: string

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    server = ret.server
    playerId = ret.playerId
    map = player.getCurrentMap() as RpgMap
    sceneMap = client.getScene<RpgSceneMap>()
})


test('Create Dynamic Event', async () => {
    @EventData({
        name: 'test'
    })
    class MyEvent extends RpgEvent { }
    const events = map.createDynamicEvent({
        x: 100,
        y: 200,
        event: MyEvent
    })
    expect(events).toBeDefined()
    expect(Object.values(map.events)).toHaveLength(1)
    const eventId = Object.keys(events)[0]

    await server.send()

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


function testRemoveEvent(mode) {
    describe('Remove Event: ' + mode + ' mode', () => {
        let event: RpgEvent, bool
    
        function eventIsDeleted(objects, event)  {
            const events: any = Object.values(objects)
            const eventFind = events.find(ev => ev.object.id == event.id)
            expect(eventFind).toBeUndefined()
        }
        
        beforeEach(async () => {
            let _map = mode == EventMode.Scenario ? player : map

            @EventData({
                name: 'test',
                mode
            })
            class MyEvent extends RpgEvent { }
            const events = _map.createDynamicEvent({
                x: 100,
                y: 200,
                event: MyEvent
            })
            const eventId = Object.keys(events)[0]
            event = _map.getEvent(eventId) as RpgEvent
            await nextTick(client)
            bool = _map.removeEvent(eventId)
        })
    
        test('Remove Event', async () => {
            expect(bool).toBeTruthy()
            await server.send()
            client.objects.subscribe((objects) => {
                eventIsDeleted(objects, event)
            })
        })
    
        test('delete even if properties are changed', async () => {
            event.hp = 100
            await server.send()
            client.objects.subscribe((objects) => {
                eventIsDeleted(objects, event)
            })
        })
    
        test('animation continues on the event even if it has been deleted', async () => {
            client.addSpriteSheet(createSprite())
            event.showAnimation('shield', 'default')
            await nextTick(client)
            await nextTick(client, 10)
            client.objects.subscribe((objects) => {
                eventIsDeleted(objects, event)
            })
        })
        
        test('Remove Event, destroyed status == true', () => {
            expect(event?.['isDestroyed']).toBeTruthy()
        })
    
        test('do not modify positions if the event is deleted', () => {
            event.teleport({ x: 0, y: 0 })
            expect(event.position.x).toEqual(100)
            expect(event.position.y).toEqual(200)
        })
    
    })
}

testRemoveEvent(EventMode.Scenario)
testRemoveEvent(EventMode.Shared)

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

        map.createDynamicEvent({
            x: 0,
            y: 0,
            event: MyEvent
        })
        player.setHitbox(1, 1)
        player.teleport({ x: 0, y: 0 })

        client.controls.setInputs({
            [Control.Action]: {
                bind: Input.Enter
            }
        })
        client.controls.applyControl(Control.Action)

        RpgPlugin.on(HookClient.SendInput, () => {
            nextTick(client)
        })

        client.processInput()

    })
})


test('Test onTouch', () => {
    return new Promise((resolve: any) => {
        @EventData({
            name: 'test',
            hitbox: {
                width: 5,
                height: 5
            }
        })
        class MyEvent extends RpgEvent {
            onPlayerTouch(_player: RpgPlayer) {
                expect(_player).toBeDefined()
                expect(_player.id).toEqual(player.id)
                resolve()
            }
        }

        map.createDynamicEvent({
            x: 6,
            y: 0,
            event: MyEvent
        })
        player.setHitbox(5, 5)
        player.teleport({ x: 0, y: 0 })

        client.controls.setInputs({
            [Control.Right]: {
                bind: Input.Right
            }
        })
        client.controls.applyControl(Control.Right)

        RpgPlugin.on(HookClient.SendInput, () => {
            nextTick(client)
        })

        client.processInput()

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

test('Test onChanges Hook [after method)', () => {
    return new Promise(async (resolve: any) => {
        clear()

        @EventData({
            name: 'test'
        })
        class MyEvent extends RpgEvent {
            onChanges(_player: RpgPlayer) {
                expect(_player).toBeDefined()
                expect(_player.getVariable('test')).toEqual(true)
                resolve()
            }
        }

        @MapData({
            id: 'other-map',
            file: require('./fixtures/maps/map.tmx'),
            events: [MyEvent]
        })
        class OtherMap extends RpgMap { }

        @RpgModule<RpgServer>({
            maps: [
                OtherMap
            ],
            player: {
                onJoinMap(player: RpgPlayer, map: RpgMap) {
                    player.setVariable('test', true)
                }
            }
        })
        class RpgServerModule { }

        clear()

        const { player } = await _beforeEach([{
            server: RpgServerModule
        }])

        player.changeMap('other-map')
    })
})

async function getDynamicEvent(instance: RpgPlayer | RpgMap) {
    @EventData({
        name: 'test'
    })
    class MyEvent extends RpgEvent { }
    const events = instance.createDynamicEvent({
        x: 100,
        y: 200,
        event: MyEvent
    })
    const [event] = Object.values(events)
    expect(event).toBeTruthy()
    event.position.x = 150
    await nextTick(client)
    const clientEvent = client.gameEngine.world.getObject(event.id)
    return {
        event,
        clientEvent
    }
}

test('Event Sync after create dynamic event (map)', async () => {
    const { clientEvent, event } = await getDynamicEvent(map)
    expect(clientEvent?.position.x).toBe(event.position.x)
})

test('Event Sync after create dynamic event (player)', async () => {
    const { clientEvent, event } = await getDynamicEvent(player)
    expect(clientEvent?.position.x).toBe(event.position.x)
})

describe('Test Scenario Event', () => {
    test('onInit Hook', () => {
        return new Promise(async (resolve: any) => {
            @EventData({
                name: 'test',
                mode: EventMode.Scenario
            })
            class MyEvent extends RpgEvent {
                onInit(_player: RpgPlayer) {
                    expect(_player.id).toBe(playerId)
                    resolve()
                }
            }

            player.createDynamicEvent({
                x: 0,
                y: 0,
                event: MyEvent
            })
        })
    })

    test('Test Collision with local event', async () => {
        @EventData({
            name: 'test',
            mode: EventMode.Scenario
        })
        class MyEvent extends RpgEvent { }

        player.createDynamicEvent({
            x: 0,
            y: 0,
            event: MyEvent
        })
        player.setHitbox(1, 1)
        await player.teleport({ x: 0, y: 0 })

        expect(player.otherPlayersCollision).toHaveLength(1)
        const [event] = player.otherPlayersCollision
        expect(event).toBeInstanceOf(MyEvent)
    })

    test('Get local event (client side)', async () => {
        @EventData({
            name: 'test',
            mode: EventMode.Scenario
        })
        class MyEvent extends RpgEvent { }

        player.createDynamicEvent({
            x: 0,
            y: 0,
            event: MyEvent
        })

        await nextTick(client)

        const events = client.gameEngine.world.getObjectsOfGroup()
        expect(Object.keys(events)).toHaveLength(2)

        const onlyEvents = (Object.values(events) as any[]).filter(ev => ev.object.type == 'event')
        expect(onlyEvents).toHaveLength(1)

        for (let eventId in events) {
            const event = events[eventId]
            if (event.object.type != 'event') continue
            expect(eventId).toBe(event.object.id)
        }
    })


    test('Clear Map Events after leave map', async () => {
        @EventData({
            name: 'test',
            mode: EventMode.Scenario
        })
        class MyEvent extends RpgEvent { }

        @MapData({
            id: 'other-map',
            file: require('./fixtures/maps/map.tmx')
        })
        class OtherMap extends RpgMap { }

        @RpgModule<RpgServer>({
            maps: [
                OtherMap
            ]
        })
        class RpgServerModule { }

        clear()

        const { player } = await _beforeEach([{
            server: RpgServerModule
        }])

        player.createDynamicEvent({
            x: 0,
            y: 0,
            event: MyEvent
        })

        await player.changeMap('other-map')

        expect(Object.values(player.events)).toHaveLength(0)
    })

})

afterEach(() => {
    clear()
})