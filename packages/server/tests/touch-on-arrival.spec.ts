import { beforeEach, afterEach, test, expect } from 'vitest'
import { testing, TestingFixture } from '@rpgjs/testing'
import { defineModule, createModule } from '@rpgjs/common'
import { RpgPlayer, RpgServer } from '../src'
import { RpgClient } from '../../client/src'
import { ARRIVAL_GRACE_MS } from '../src/rooms/map-touch'

const touches: string[] = []

const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: 'arrival-map',
      // The player arrives exactly on this event.
      events: [{
        id: 'door',
        x: 100,
        y: 100,
        event: {
          onPlayerTouch(player: RpgPlayer) {
            touches.push(`door:${player.id}`)
          },
        },
      }],
    },
  ],
  player: {
    async onConnected(player) {
      await player.changeMap('arrival-map', { x: 100, y: 100 })
    },
  },
})

let fixture: TestingFixture
let client: any
let player: RpgPlayer

beforeEach(async () => {
  touches.length = 0
  fixture = await testing(createModule('TouchOnArrival', [{ server: serverModule, client: defineModule<RpgClient>({}) }]))
  client = await fixture.createClient()
})

afterEach(() => {
  fixture.clear()
})

const contact = (map: any, p: RpgPlayer) => ({
  entityA: map.getBody(p.id),
  entityB: map.getBody('door'),
})

test('an event under the arrival point does not fire onPlayerTouch when the player joins the map', async () => {
  player = await client.waitForMapChange('arrival-map')
  const map = player.getCurrentMap() as any

  // The physics engine reports the overlap found at spawn as a normal collision enter.
  map.physic.getEvents().emitCollisionEnter(contact(map, player))
  await fixture.wait(0)

  expect(touches).toEqual([])
})

test('the same event fires once the player left it and comes back', async () => {
  player = await client.waitForMapChange('arrival-map')
  const map = player.getCurrentMap() as any

  map.physic.getEvents().emitCollisionEnter(contact(map, player))
  map.physic.getEvents().emitCollisionExit(contact(map, player))
  await fixture.wait(0)
  expect(touches).toEqual([])

  map.physic.getEvents().emitCollisionEnter(contact(map, player))
  await fixture.wait(0)

  expect(touches).toEqual([`door:${player.id}`])
})

test('an event placed on the player right after the join (Studio teleports its events in onInit) does not fire either', async () => {
  player = await client.waitForMapChange('arrival-map')
  const map = player.getCurrentMap() as any

  await map.createDynamicEvent({
    id: 'late',
    x: player.x(),
    y: player.y(),
    event: { onPlayerTouch(p: RpgPlayer) { touches.push(`late:${p.id}`) } },
  })
  const lateContact = { entityA: map.getBody(player.id), entityB: map.getBody('late') }
  map.physic.getEvents().emitCollisionEnter(lateContact)
  await fixture.wait(0)
  expect(touches).toEqual([])

  map.physic.getEvents().emitCollisionExit(lateContact)
  map.physic.getEvents().emitCollisionEnter(lateContact)
  await fixture.wait(0)
  expect(touches).toEqual([`late:${player.id}`])
})

test('an event that reaches a player after the arrival window still fires onPlayerTouch', async () => {
  player = await client.waitForMapChange('arrival-map')
  const map = player.getCurrentMap() as any

  await fixture.wait(ARRIVAL_GRACE_MS + 100)
  await map.createDynamicEvent({
    id: 'late',
    x: player.x(),
    y: player.y(),
    event: { onPlayerTouch(p: RpgPlayer) { touches.push(`late:${p.id}`) } },
  })
  map.physic.getEvents().emitCollisionEnter({ entityA: map.getBody(player.id), entityB: map.getBody('late') })
  await fixture.wait(0)

  expect(touches).toEqual([`late:${player.id}`])
})

test('a player who sent an input right after the join still touches events', async () => {
  player = await client.waitForMapChange('arrival-map')
  const map = player.getCurrentMap() as any

  ;(player as any).lastProcessedInputTs = Date.now()
  await map.createDynamicEvent({
    id: 'walked-into',
    x: player.x(),
    y: player.y(),
    event: { onPlayerTouch(p: RpgPlayer) { touches.push(`walked-into:${p.id}`) } },
  })
  map.physic.getEvents().emitCollisionEnter({ entityA: map.getBody(player.id), entityB: map.getBody('walked-into') })
  await fixture.wait(0)

  expect(touches).toEqual([`walked-into:${player.id}`])
})
