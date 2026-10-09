import { afterEach, beforeEach, test, expect, vi } from 'vitest'
import { testing, type TestingFixture } from '@rpgjs/testing'
import { defineModule, createModule, RpgModule } from '@rpgjs/common'
import { provideServerModules, RpgPlayer, RpgServer } from '../src'
import { RpgClient } from '../../client/src'

const onLoad = vi.fn()
const onSave = vi.fn()

// Define your server module
const serverModule = defineModule<RpgServer>({
  player: {
    async onConnected(player) {
      player.setVariable('test', 'value')
      await player.applySnapshot({ locale: 'en', custom: 'loaded' })
      await player.save(0)
    },
    onLoad,
    onSave,
  }
})

// Define your client module
const clientModule = defineModule<RpgClient>({
  // Client-side logic
})

let player: RpgPlayer
let fixture: TestingFixture

beforeEach(async () => {
    onLoad.mockClear()
    onSave.mockClear()
    // Create module using createModule
    const myModule = createModule('MyModule', [{
        server: serverModule,
        client: clientModule
    }])
    
    // Pass the module created with createModule to testing
    fixture = await testing(myModule)
    const client = await fixture.createClient()
    player = client.player
})

afterEach(() => fixture.clear())

test('Module hook was called', () => {
  expect(player.getVariable('test')).toBe('value')
})

test('onLoad and onSave receive the player snapshot', () => {
  expect(onLoad).toHaveBeenCalledWith(player, expect.objectContaining({ custom: 'loaded' }))
  expect(onSave).toHaveBeenCalledWith(player, expect.objectContaining({ locale: 'en' }))
})

test('decorated v4 modules and native v5 modules preserve hook order', async () => {
  const calls: string[] = []
  class LegacyModule {}
  RpgModule<RpgServer>({
    player: {
      onConnected() {
        calls.push('legacy')
      }
    }
  })(LegacyModule)

  const nativeModule = defineModule<RpgServer>({
    player: {
      onConnected() {
        calls.push('native')
      }
    }
  })

  const provider = provideServerModules([LegacyModule, nativeModule]) as any
  const hooks = provider.useFactory({ values: {} })
  await new Promise<void>((resolve, reject) => {
    hooks.callHooks('server-player-onConnected', {}).subscribe({
      complete: resolve,
      error: reject,
    })
  })

  expect(calls).toEqual(['legacy', 'native'])
})
