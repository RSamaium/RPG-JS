import { beforeEach, test, expect, afterEach } from 'vitest'
import { testing } from '@rpgjs/testing'
import { defineModule, createModule } from '@rpgjs/common'
import { RpgPlayer, RpgServer } from '../src'
import { RpgClient } from '../../client/src'

// Define server module with two maps
const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: 'map1',
      file: '',
    },
    {
      id: 'map2',
      file: '',
    }
  ],
  map: {
    onBeforeUpdate(mapData) {
      if (mapData.id === 'map2') {
        mapData.positions = {
          start: { x: 300, y: 310 },
          entrance: { x: 400, y: 410 },
        }
      }
      return mapData
    }
  },
  player: {
    async onConnected(player) {
      // Start player on map1
      await player.changeMap('map1', { x: 100, y: 100 })
    },
    onJoinMap(player) {
      console.log('onJoinMap', player.getCurrentMap()?.id)
    }
  }
})

// Define client module
const clientModule = defineModule<RpgClient>({
  // Client-side logic
})

let player: RpgPlayer
let client: any
let fixture: any

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

test('Player can change map', async () => {
    player = await client.waitForMapChange('map1')
    
    const initialMap = player.getCurrentMap()
    expect(initialMap).toBeDefined()
    expect(initialMap?.id).toBe('map1')
    
    const result = await player.changeMap('map2', { x: 200, y: 200 })
    expect(result).toBe(true)
    
    player = await client.waitForMapChange('map2')
    
    const newMap = player.getCurrentMap()
    expect(newMap).toBeDefined()
    expect(newMap?.id).toBe('map2')
    
    expect(player.x()).toBe(200)
    expect(player.y()).toBe(200)

    player.setHitbox(64, 48)
    await player.changeMap('map1', { x: 120, y: 140 })
    player = await client.waitForMapChange('map1')

    expect(player.x()).toBe(120)
    expect(player.y()).toBe(140)
    expect(player.hitbox()).toEqual({ w: 64, h: 48 })
    expect(player.getCurrentMap()?.getBody(player.id)?.width).toBe(64)
    expect(player.getCurrentMap()?.getBody(player.id)?.height).toBe(48)

    const implicitResult = await player.changeMap('map2')
    expect(implicitResult).toBe(true)

    player = await client.waitForMapChange('map2')
    await fixture.wait(0)

    expect(player.x()).toBe(300)
    expect(player.y()).toBe(310)

    await player.changeMap('map1', { x: 100, y: 100 })
    player = await client.waitForMapChange('map1')

    const namedResult = await player.changeMap('map2', 'entrance')
    expect(namedResult).toBe(true)

    player = await client.waitForMapChange('map2')
    await fixture.wait(0)

    expect(player.x()).toBe(400)
    expect(player.y()).toBe(410)
})

test('Player start hook can change map with a custom hitbox in standalone mode', async () => {
    const serverModule = defineModule<RpgServer>({
        maps: [
            {
                id: 'center-map',
                file: '',
            }
        ],
        player: {
            onStart(player) {
                player.setHitbox(96, 80)
                player.changeMap('center-map', { x: 500, y: 500 })
            }
        }
    })
    const myModule = createModule('StartModule', [{
        server: serverModule,
        client: clientModule
    }])
    const startFixture = await testing(myModule)
    const startClient = await startFixture.createClient()

    await startClient.socket.send({
        action: 'gui.interaction',
        value: {
            guiId: 'title-screen',
            name: 'select',
            data: { id: 'start' },
        },
    })

    const startedPlayer = await startClient.waitForMapChange('center-map')
    expect(startedPlayer.x()).toBe(500)
    expect(startedPlayer.y()).toBe(500)
    expect(startedPlayer.hitbox()).toEqual({ w: 96, h: 80 })
    expect(startedPlayer.getCurrentMap()?.getBody(startedPlayer.id)?.width).toBe(96)
    expect(startedPlayer.getCurrentMap()?.getBody(startedPlayer.id)?.height).toBe(80)

    await startFixture.clear()
})

test('Player start hook preserves permanent custom props across the first map transfer', async () => {
    const serverModule = defineModule<RpgServer>({
        maps: [
            {
                id: 'actor-map',
                file: '',
            }
        ],
        player: {
            props: {
                selectedActorId: {
                    $default: null,
                    $syncWithClient: false,
                    $permanent: true,
                },
            },
            onStart(player) {
                const selectedActorId = (player as any).selectedActorId
                selectedActorId.set('luna')
                player.changeMap('actor-map')
            }
        }
    })
    const myModule = createModule('PermanentPropsStartModule', [{
        server: serverModule,
        client: clientModule
    }])
    const startFixture = await testing(myModule)
    const startClient = await startFixture.createClient()

    await startClient.socket.send({
        action: 'gui.interaction',
        value: {
            guiId: 'title-screen',
            name: 'select',
            data: { id: 'start' },
        },
    })

    const startedPlayer = await startClient.waitForMapChange('actor-map')
    expect((startedPlayer as any).selectedActorId()).toBe('luna')

    await startFixture.clear()
})
