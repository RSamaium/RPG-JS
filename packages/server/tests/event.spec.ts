import { beforeEach, test, expect, afterEach, vi } from 'vitest'
import { testing, TestingFixture } from '@rpgjs/testing'
import { defineModule, createModule } from '@rpgjs/common'
import { EventData, RpgEvent, RpgPlayer, RpgServer, Move } from '../src'
import { RpgClient } from '../../client/src'
import { createStatesSnapshotDeep } from '@signe/sync'

const Event = () => {
  return {
    name: "EV-1",
    onInit() {
      this.setGraphic("hero");
    }
  }
}

// Define server module with two maps
const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: 'map1',
      events: [{ event: Event(), x: 100, y: 150 }]
    },
  ],
  player: {
    async onConnected(player) {
      await player.changeMap('map1', { x: 100, y: 126 })
    }
  }
})

// Define client module
const clientModule = defineModule<RpgClient>({
  // Client-side logic
})

let player: RpgPlayer
let client: any
let fixture: TestingFixture

beforeEach(async () => {
    const myModule = createModule('TestModule', [{
        server: serverModule,
        client: clientModule
    }])
    
    fixture = await testing(myModule)
    client = await fixture.createClient()
    player = client.player
})

afterEach(() => {
  fixture.clear()
})

test.skip('Player to touch event', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    const event = map?.getEvents()[0]
    expect(event).toBeDefined()
    expect(event?.name).toBe("EV-1")
    expect(event?.x()).toBe(100)
    expect(event?.y()).toBe(150)
    await fixture.waitUntil(
        player.moveRoutes([
          Move.tileDown(2),
        ], {
          onStuck: () => false
        })
    )
    expect(event?.x()).toBe(100)
    expect(event?.y()).toBe(150)
    await fixture.waitUntil(
      event!.moveRoutes([
        Move.down()
      ])
    )
    expect(event?.x()).toBe(100)
    expect(event?.y()).toBe(150 + event!.speed)
   
})

test('event without pushable stays immovable while keeping its configured mass', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const event = map?.getEvents()[0]
    const body = map?.getBody(event.id)
    const playerBody = map?.getBody(player.id)

    expect(event.graphics()).toEqual(["hero"])
    expect(createStatesSnapshotDeep(map).events[event.id].graphics).toEqual(["hero"])
    expect(event.pushable).toBe(false)
    expect(event.mass).toBe(100)
    expect(body?.mass).toBe(100)
    expect(body?.invMass).toBe(1 / 100)
    expect(body?.canBePushedBy(playerBody)).toBe(false)
})

test('object-based EventDefinition applies mass to the physics body when pushable', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    await map.createDynamicEvent({
      id: "crate-object",
      x: 160,
      y: 160,
      event: {
        name: "Crate",
        pushable: true,
        mass: 20,
        onInit() {
          expect(this.mass).toBe(20)
          expect(this.pushable).toBe(true)
        }
      }
    })
    await fixture.nextTick()

    const event = map.getEvent("crate-object")
    const body = map.getBody("crate-object")

    expect(event.mass).toBe(20)
    expect(event.pushable).toBe(true)
    expect(body.mass).toBe(20)
    expect(body.invMass).toBe(1 / 20)
})

test('object-based EventDefinition mass does not make an event pushable by itself', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    await map.createDynamicEvent({
      id: "heavy-static-object",
      x: 175,
      y: 160,
      event: {
        name: "HeavyStatic",
        mass: 20,
      }
    })
    await fixture.nextTick()

    const event = map.getEvent("heavy-static-object")
    const body = map.getBody("heavy-static-object")
    const playerBody = map.getBody(player.id)

    expect(event.mass).toBe(20)
    expect(event.pushable).toBe(false)
    expect(body.mass).toBe(20)
    expect(body.invMass).toBe(1 / 20)
    expect(body.canBePushedBy(playerBody)).toBe(false)
})

test('createDynamicEvent applies width and height hitbox data to the event body', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    await map.createDynamicEvent({
      id: "wide-hitbox-object",
      x: 180,
      y: 160,
      hitbox: {
        width: 56,
        height: 261,
      },
      event: {
        name: "WideHitbox",
      }
    })
    await fixture.nextTick()

    const event = map.getEvent("wide-hitbox-object")
    const body = map.getBody("wide-hitbox-object")

    expect(event.hitbox()).toEqual({ w: 56, h: 261 })
    expect(body.width).toBe(56)
    expect(body.height).toBe(261)

    const snapshot = createStatesSnapshotDeep(map)
    expect(snapshot.events["wide-hitbox-object"].hitbox).toEqual({ w: 56, h: 261 })
})

test('non-pushable events can still move through scripted routes', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    await map.createDynamicEvent({
      id: "scripted-npc",
      x: 300,
      y: 160,
      event: {
        name: "ScriptedNpc",
      }
    })
    await fixture.nextTick()

    const event = map.getEvent("scripted-npc")
    const startY = event.y()

    await fixture.waitUntil(
      event.moveRoutes([
        Move.down()
      ])
    )

    expect(event.pushable).toBe(false)
    expect(event.y()).toBe(startY + event.speed)
})

test('EventData mass applies to class-based events when pushable', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    class HeavyEvent extends RpgEvent {}
    EventData({
      name: "Heavy",
      pushable: true,
      mass: 250,
    })(HeavyEvent)

    await map.createDynamicEvent({
      id: "heavy-class",
      x: 190,
      y: 160,
      event: HeavyEvent,
    })
    await fixture.nextTick()

    const event = map.getEvent("heavy-class")
    const body = map.getBody("heavy-class")

    expect(event.mass).toBe(250)
    expect(event.pushable).toBe(true)
    expect(body.mass).toBe(250)
    expect(body.invMass).toBe(1 / 250)
})

test('setMass updates an existing pushable event physics body', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    await map.createDynamicEvent({
      id: "runtime-mass",
      x: 220,
      y: 160,
      event: {
        name: "RuntimeMass",
        pushable: true,
      }
    })
    await fixture.nextTick()

    const event = map.getEvent("runtime-mass")
    const body = map.getBody("runtime-mass")

    event.setMass(5)

    expect(event.mass).toBe(5)
    expect(body.mass).toBe(5)
    expect(body.invMass).toBe(1 / 5)
})

test('setMass does not make a non-pushable event movable', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    await map.createDynamicEvent({
      id: "runtime-static-mass",
      x: 240,
      y: 160,
      event: {
        name: "RuntimeStaticMass",
      }
    })
    await fixture.nextTick()

    const event = map.getEvent("runtime-static-mass")
    const body = map.getBody("runtime-static-mass")

    event.setMass(5)

    expect(event.mass).toBe(5)
    expect(event.pushable).toBe(false)
    expect(body.mass).toBe(5)
    expect(body.invMass).toBe(1 / 5)
    expect(body.canBePushedBy(map.getBody(player.id))).toBe(false)
})

test('changing pushable at runtime updates the event physics body', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    await map.createDynamicEvent({
      id: "runtime-pushable",
      x: 260,
      y: 160,
      event: {
        name: "RuntimePushable",
        mass: 12,
      }
    })
    await fixture.nextTick()

    const event = map.getEvent("runtime-pushable")
    const body = map.getBody("runtime-pushable")

    expect(body.mass).toBe(12)
    expect(body.canBePushedBy(map.getBody(player.id))).toBe(false)

    event.pushable = true
    await fixture.nextTick()

    expect(event.pushable).toBe(true)
    expect(body.mass).toBe(12)
    expect(body.invMass).toBe(1 / 12)
    expect(body.canBePushedBy(map.getBody(player.id))).toBe(true)
})

test('event touch hooks run once on event/event enter and on exit for both events', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    await map.createDynamicEvent({
      id: "plate",
      x: 300,
      y: 300,
      event: {
        name: "plate",
        onTouch(other, context) {
          calls.push(`plate:${other.name}:${context.phase}:${context.otherType}:${context.player ? "player" : "none"}`)
        },
        onTouchEnd(other, context) {
          calls.push(`plate:${other.name}:${context.phase}:${context.otherType}:${context.player ? "player" : "none"}`)
        },
      }
    })
    await map.createDynamicEvent({
      id: "stone",
      x: 300,
      y: 300,
      event: {
        name: "stone",
        pushable: true,
        onTouch(other, context) {
          calls.push(`stone:${other.name}:${context.phase}:${context.otherType}:${context.player ? "player" : "none"}`)
        },
        onTouchEnd(other, context) {
          calls.push(`stone:${other.name}:${context.phase}:${context.otherType}:${context.player ? "player" : "none"}`)
        },
      }
    })

    const plateBody = map.getBody("plate")
    const stoneBody = map.getBody("stone")
    const collision = { entityA: plateBody, entityB: stoneBody }

    map.physic.getEvents().emitCollisionEnter(collision)
    map.physic.getEvents().emitCollisionEnter(collision)
    await fixture.wait(0)

    expect(calls).toEqual([
      "plate:stone:start:event:none",
      "stone:plate:start:event:none",
    ])

    map.physic.getEvents().emitCollisionExit(collision)
    await fixture.wait(0)

    expect(calls).toEqual([
      "plate:stone:start:event:none",
      "stone:plate:start:event:none",
      "plate:stone:end:event:none",
      "stone:plate:end:event:none",
    ])
})

test('ground event touch sensors wait until the plate is covered enough', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    await map.createDynamicEvent({
      id: "floor-switch",
      x: 500,
      y: 500,
      hitbox: {
        width: 32,
        height: 32,
      },
      event: {
        name: "floor-switch",
        onInit() {
          this.through = true
          this.throughEvent = true
          this.z.set(-1000)
        },
        onTouch(other, context) {
          calls.push(`switch:${other.name}:${context.phase}`)
        },
        onTouchEnd(other, context) {
          calls.push(`switch:${other.name}:${context.phase}`)
        },
      }
    })
    await map.createDynamicEvent({
      id: "stone-cover",
      x: 518,
      y: 500,
      hitbox: {
        width: 98,
        height: 105,
      },
      event: {
        name: "stone-cover",
      }
    })

    const switchBody = map.getBody("floor-switch")
    const stoneBody = map.getBody("stone-cover")
    const collision = { entityA: switchBody, entityB: stoneBody }

    map.physic.getEvents().emitCollisionEnter(collision)
    await fixture.wait(0)

    expect(calls).toEqual([])

    map.setBodyPosition("stone-cover", 492, 500, "top-left")
    await map.nextTickAsync()
    await fixture.wait(0)

    expect(calls).toEqual([
      "switch:stone-cover:start",
    ])

    map.setBodyPosition("stone-cover", 518, 500, "top-left")
    await map.nextTickAsync()
    await fixture.wait(0)

    expect(calls).toEqual([
      "switch:stone-cover:start",
      "switch:stone-cover:end",
    ])

    map.physic.getEvents().emitCollisionExit(collision)
    await fixture.wait(0)

    expect(calls).toEqual([
      "switch:stone-cover:start",
      "switch:stone-cover:end",
    ])
})

test('event touch hooks ignore collisions across different z levels', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    await map.createDynamicEvent({
      id: "low-plate",
      x: 310,
      y: 310,
      event: {
        name: "low-plate",
        onTouch(other, context) {
          calls.push(`low:${other.name}:${context.phase}`)
        },
        onTouchEnd(other, context) {
          calls.push(`low:${other.name}:${context.phase}`)
        },
      }
    })
    await map.createDynamicEvent({
      id: "high-stone",
      x: 310,
      y: 310,
      event: {
        name: "high-stone",
        onInit() {
          this.z.set(1)
        },
        onTouch(other, context) {
          calls.push(`high:${other.name}:${context.phase}`)
        },
        onTouchEnd(other, context) {
          calls.push(`high:${other.name}:${context.phase}`)
        },
      }
    })

    const lowBody = map.getBody("low-plate")
    const highBody = map.getBody("high-stone")
    const collision = { entityA: lowBody, entityB: highBody }

    map.physic.getEvents().emitCollisionEnter(collision)
    map.physic.getEvents().emitCollisionExit(collision)
    await fixture.wait(0)

    expect(calls).toEqual([])
})

test('event touch tracking is removed when collision exits after z changes', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    await map.createDynamicEvent({
      id: "z-changing-plate",
      x: 320,
      y: 320,
      event: {
        name: "z-changing-plate",
        onTouch(other, context) {
          calls.push(`plate:${other.name}:${context.phase}`)
        },
        onTouchEnd(other, context) {
          calls.push(`plate:${other.name}:${context.phase}`)
        },
      }
    })
    await map.createDynamicEvent({
      id: "z-changing-stone",
      x: 320,
      y: 320,
      event: {
        name: "z-changing-stone",
        onTouch(other, context) {
          calls.push(`stone:${other.name}:${context.phase}`)
        },
        onTouchEnd(other, context) {
          calls.push(`stone:${other.name}:${context.phase}`)
        },
      }
    })

    const plate = map.getEvent("z-changing-plate")
    const stone = map.getEvent("z-changing-stone")
    const collision = {
      entityA: map.getBody("z-changing-plate"),
      entityB: map.getBody("z-changing-stone"),
    }

    map.physic.getEvents().emitCollisionEnter(collision)
    await fixture.wait(0)

    expect(calls).toEqual([
      "plate:z-changing-stone:start",
      "stone:z-changing-plate:start",
    ])

    stone.z.set(1)
    await map.nextTickAsync()
    await fixture.wait(0)

    expect(calls).toEqual([
      "plate:z-changing-stone:start",
      "stone:z-changing-plate:start",
      "plate:z-changing-stone:end",
      "stone:z-changing-plate:end",
    ])

    map.physic.getEvents().emitCollisionExit(collision)
    await fixture.wait(0)

    stone.z.set(plate.z())
    await map.nextTickAsync()
    await fixture.wait(0)

    expect(calls).toEqual([
      "plate:z-changing-stone:start",
      "stone:z-changing-plate:start",
      "plate:z-changing-stone:end",
      "stone:z-changing-plate:end",
    ])
})

test('always-on-top events do not resolve physical collisions', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    player.z.set(1000)

    await map.createDynamicEvent({
      id: "top-overlay",
      x: player.x(),
      y: player.y(),
      event: {
        name: "top-overlay",
        onInit() {
          this.z.set(1000)
        },
      }
    })
    await fixture.nextTick()

    map.createShape({
      name: "solid-wall",
      x: player.x(),
      y: player.y(),
      width: 32,
      height: 32,
    })

    const playerBody = map.getBody(player.id)
    const eventBody = map.getBody("top-overlay")
    const wallBody = map.physic.getEntityByUUID("shape-solid-wall")

    expect(playerBody.shouldResolveCollisionWith(eventBody)).toBe(false)
    expect(eventBody.shouldResolveCollisionWith(wallBody)).toBe(false)
})

test('events on a regular z level still resolve collisions on the same level', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    player.z.set(1)

    await map.createDynamicEvent({
      id: "regular-z-event",
      x: player.x(),
      y: player.y(),
      event: {
        name: "regular-z-event",
        onInit() {
          this.z.set(1)
        },
      }
    })
    await fixture.nextTick()

    const playerBody = map.getBody(player.id)
    const eventBody = map.getBody("regular-z-event")

    expect(playerBody.shouldResolveCollisionWith(eventBody)).toBe(true)
})

test('class-based events receive touch hooks', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    class TouchClassEvent extends RpgEvent {
      onTouch(other: RpgPlayer | RpgEvent, context: any) {
        calls.push(`${this.id}:${other.name}:${context.phase}:${context.otherType}`)
      }
    }

    await map.createDynamicEvent({
      id: "class-touch",
      x: 320,
      y: 320,
      event: TouchClassEvent,
    })
    await map.createDynamicEvent({
      id: "class-other",
      x: 320,
      y: 320,
      event: {
        name: "class-other",
      }
    })

    map.physic.getEvents().emitCollisionEnter({
      entityA: map.getBody("class-touch"),
      entityB: map.getBody("class-other"),
    })
    await fixture.wait(0)

    expect(calls).toEqual([
      "class-touch:class-other:start:event",
    ])
})

test('player/event touch keeps onPlayerTouch compatibility and exposes context.player', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    await map.createDynamicEvent({
      id: "touch-npc",
      x: player.x(),
      y: player.y(),
      event: {
        name: "TouchNpc",
        onTouch(other, context) {
          calls.push(`onTouch:${other.id}:${context.player?.id}:${context.otherType}:${context.phase}`)
        },
        onTouchEnd(other, context) {
          calls.push(`onTouchEnd:${other.id}:${context.player?.id}:${context.otherType}:${context.phase}`)
        },
        onPlayerTouch(otherPlayer) {
          calls.push(`onPlayerTouch:${otherPlayer.id}`)
        },
      }
    })

    const playerBody = map.getBody(player.id)
    const eventBody = map.getBody("touch-npc")
    const collision = { entityA: playerBody, entityB: eventBody }

    map.physic.getEvents().emitCollisionEnter(collision)
    await fixture.wait(0)

    expect(calls).toEqual([
      `onTouch:${player.id}:${player.id}:player:start`,
      `onPlayerTouch:${player.id}`,
    ])

    map.physic.getEvents().emitCollisionExit(collision)
    await fixture.wait(0)

    expect(calls).toEqual([
      `onTouch:${player.id}:${player.id}:player:start`,
      `onPlayerTouch:${player.id}`,
      `onTouchEnd:${player.id}:${player.id}:player:end`,
    ])
})

test('static shapes dispatch onInShape and onOutShape once per contact', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    const shape = map.createShape({ name: "zone", x: player.x(), y: player.y(), width: 32, height: 32 })
    await map.createDynamicEvent({
      id: "shape-npc",
      x: player.x(),
      y: player.y(),
      event: {
        onInShape(zone, other) {
          calls.push(`event:in:${zone.name}:${other.id}`)
        },
        onOutShape(zone, other) {
          calls.push(`event:out:${zone.name}:${other.id}`)
        },
      }
    })
    const execMethod = vi.spyOn(player, 'execMethod')
    const shapeBody = map.physic.getEntityByUUID("shape-zone")
    const playerContact = { entityA: shapeBody, entityB: map.getBody(player.id) }
    const eventContact = { entityA: map.getBody("shape-npc"), entityB: shapeBody }

    map.physic.getEvents().emitCollisionEnter(playerContact)
    map.physic.getEvents().emitCollisionEnter(playerContact)
    map.physic.getEvents().emitCollisionEnter(eventContact)
    await fixture.wait(0)

    expect(execMethod.mock.calls.filter(([hook]) => hook === 'onInShape')).toEqual([
      ['onInShape', [player, shape]],
    ])
    expect(calls).toEqual(["event:in:zone:shape-npc"])

    map.physic.getEvents().emitCollisionExit(playerContact)
    map.physic.getEvents().emitCollisionExit(playerContact)
    map.physic.getEvents().emitCollisionExit(eventContact)
    await fixture.wait(0)

    expect(execMethod.mock.calls.filter(([hook]) => hook === 'onOutShape')).toEqual([
      ['onOutShape', [player, shape]],
    ])
    expect(calls).toEqual(["event:in:zone:shape-npc", "event:out:zone:shape-npc"])
})

test('scenario event touch hooks only run for the owner player', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const calls: string[] = []

    const otherOwnedEventId = await map.createDynamicEvent({
      id: "private-touch-other",
      x: player.x(),
      y: player.y(),
      event: {
        name: "PrivateTouch",
        onTouch(other, context) {
          calls.push(`other:start:${other.id}:${context.player?.id}`)
        },
        onTouchEnd(other, context) {
          calls.push(`other:end:${other.id}:${context.player?.id}`)
        },
      }
    }, { mode: "scenario", scenarioOwnerId: "another-player" })

    map.physic.getEvents().emitCollisionEnter({
      entityA: map.getBody(player.id),
      entityB: map.getBody(otherOwnedEventId),
    })
    map.physic.getEvents().emitCollisionExit({
      entityA: map.getBody(player.id),
      entityB: map.getBody(otherOwnedEventId),
    })
    await fixture.wait(0)

    expect(calls).toEqual([])

    const ownedEventId = await map.createDynamicEvent({
      id: "private-touch-owner",
      x: player.x(),
      y: player.y(),
      event: {
        name: "PrivateTouchOwner",
        onTouch(other, context) {
          calls.push(`owner:start:${other.id}:${context.player?.id}`)
        },
        onTouchEnd(other, context) {
          calls.push(`owner:end:${other.id}:${context.player?.id}`)
        },
      }
    }, { mode: "scenario", scenarioOwnerId: player.id })

    const ownerCollision = {
      entityA: map.getBody(player.id),
      entityB: map.getBody(ownedEventId),
    }

    map.physic.getEvents().emitCollisionEnter(ownerCollision)
    await fixture.wait(0)

    expect(calls).toEqual([
      `owner:start:${player.id}:${player.id}`,
    ])

    map.physic.getEvents().emitCollisionExit(ownerCollision)
    await fixture.wait(0)

    expect(calls).toEqual([
      `owner:start:${player.id}:${player.id}`,
      `owner:end:${player.id}:${player.id}`,
    ])
})

test('map variables expose persistent shared state helpers', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any

    map.setVariable("temple.door.open", true)
    map.setVariable("counter", 2)

    expect(map.getVariable<boolean>("temple.door.open")).toBe(true)
    expect(map.hasVariable("counter")).toBe(true)
    expect(map.getVariableKeys().sort()).toEqual(["counter", "temple.door.open"])

    const snapshot = createStatesSnapshotDeep(map)
    expect(snapshot.variables).toEqual({
      "temple.door.open": true,
      counter: 2,
    })

    expect(map.removeVariable("counter")).toBe(true)
    expect(map.removeVariable("missing")).toBe(false)
    expect(map.hasVariable("counter")).toBe(false)

    map.clearVariables()
    expect(map.getVariableKeys()).toEqual([])
})

test('map variable writes trigger visible event onChanges with recursion guard', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    let changes = 0

    await map.createDynamicEvent({
      id: "door",
      x: 360,
      y: 300,
      event: {
        name: "door",
        onChanges() {
          changes += 1
          map.setVariable("door.lastChange", changes)
        }
      }
    })

    map.setVariable("temple.door.open", true)
    await fixture.wait(0)

    expect(changes).toBe(1)
    expect(map.getVariable("door.lastChange")).toBe(1)
})

test('map variable writes trigger onChanges for every player on the map', async () => {
    player = await client.waitForMapChange('map1')
    const otherClient = await fixture.createClient()
    const otherPlayer = await otherClient.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    const changesByPlayer = new Map<string, number>()

    await map.createDynamicEvent({
      id: "shared-door",
      x: 420,
      y: 300,
      event: {
        name: "shared-door",
        onChanges(changedPlayer) {
          changesByPlayer.set(changedPlayer.id, (changesByPlayer.get(changedPlayer.id) ?? 0) + 1)
        }
      }
    })

    map.setVariable("shared.door.open", true)
    await fixture.wait(0)

    expect(changesByPlayer.get(player.id)).toBe(1)
    expect(changesByPlayer.get(otherPlayer.id)).toBe(1)
})

test('player variable writes trigger onChanges with recursion guard', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap() as any
    let changes = 0

    await map.createDynamicEvent({
      id: "player-state-door",
      x: 390,
      y: 300,
      event: {
        name: "player-state-door",
        onChanges(changedPlayer) {
          changes += 1
          changedPlayer.setVariable("door.checked", changes)
        }
      }
    })

    player.setVariable("quest.started", true)
    await fixture.wait(0)

    expect(changes).toBe(1)
    expect(player.getVariable("door.checked")).toBe(1)
})
