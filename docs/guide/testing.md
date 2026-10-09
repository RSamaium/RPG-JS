---
title: "Testing with @rpgjs/testing"
description: "Guide for Testing with @rpgjs/testing in RPGJS."
---

# Testing with @rpgjs/testing

The `@rpgjs/testing` package provides utilities to test your RPGJS modules and game logic in a controlled environment. It sets up both server and client instances, allowing you to test player interactions, server hooks, and game mechanics.

## Installation

The `@rpgjs/testing` package is already included in RPGJS projects. If you need to install it separately:

```bash
npm install @rpgjs/testing 
```

## Setup

### Vitest Configuration

To use the testing utilities, configure Vitest to use the setup file provided by `@rpgjs/testing`. This setup file automatically mocks WebGL, images, and media elements for testing in a Node.js environment.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['@rpgjs/testing/dist/setup.js'],
    environment: 'node',
    globals: true
  }
})
```

The setup file automatically:
- Mocks WebGL canvas using `vitest-webgl-canvas-mock`
- Mocks image loading
- Mocks HTML media elements (audio/video)
- Creates a DOM container for the game

## Basic Usage

### Simple Test

The simplest way to test is to use the `testing()` function without any modules:

```typescript
import { testing } from '@rpgjs/testing'
import { beforeEach, test, expect } from 'vitest'
import { RpgPlayer } from '@rpgjs/server'

let player: RpgPlayer

beforeEach(async () => {
  const fixture = await testing()
  const client = await fixture.createClient()
  player = client.player
})

test('Player has default HP', () => {
  expect(player.hp).toBeGreaterThan(0)
})
```

### Understanding the Testing Fixture

The `testing()` function returns a fixture object with a `createClient()` method:

```typescript
const fixture = await testing()
const client = await fixture.createClient()
```

The `client` object provides access to:

- **`server`**: The RpgServer instance
- **`socket`**: The WebSocket connection
- **`client`**: The RpgClientEngine instance
- **`playerId`**: The unique identifier of the player
- **`player`**: A getter that returns the RpgPlayer instance

```typescript
const client = await fixture.createClient()

// Access the server
const server = client.server

// Access the client engine
const engine = client.client

// Access the player
const player = client.player

// Access the player ID
const playerId = client.playerId
```

## Testing with Custom Modules

You can test your custom modules by passing their server and client definitions to the `testing()` function:

```typescript
import { testing } from '@rpgjs/testing'
import { defineModule, type RpgServer } from '@rpgjs/server'
import type { RpgClient } from '@rpgjs/client'

// Define your server module
const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: 'test-map',
      file: '',
    },
  ],
  database: {
    // Define items, weapons, armors, etc. here
    TestPotion: {
      id: 'TestPotion',
      name: 'Test Potion',
      description: 'Restores 100 HP',
      price: 200,
      hpValue: 100,
      consumable: true,
      _type: 'item' as const,
    },
  },
  player: {
    async onConnected(player) {
      await player.changeMap('test-map', { x: 100, y: 100 })
      player.setVariable('test', 'value')
    }
  }
})

// Define your client module
const clientModule = defineModule<RpgClient>({
  // Client-side logic
})

const myModule = [{ server: serverModule, client: clientModule }]

// Use it in tests
let player: RpgPlayer
let client: any
let fixture: any

beforeEach(async () => {
  fixture = await testing(myModule)
  client = await fixture.createClient()
  player = await client.waitForMapChange('test-map')
})

afterEach(async () => {
  await fixture.clear()
})

test('Module hook was called', () => {
  expect(player.getVariable('test')).toBe('value')
})
```

## Advanced Configuration

### Server Configuration

You can pass custom server configuration:

```typescript
const fixture = await testing([], {}, {
  providers: [
    // Custom server providers
  ],
  // Other server config options
})
```

### Client Configuration

You can pass custom client configuration:

```typescript
const fixture = await testing([], {
  providers: [
    // Custom client providers
  ],
  // Other client config options
})
```

### Complete Example

```typescript
import { testing } from '@rpgjs/testing'
import { beforeEach, afterEach, test, expect } from 'vitest'
import { RpgPlayer } from '@rpgjs/server'
import type { RpgServer, RpgClient } from '@rpgjs/server'
import { myModule } from './my-module'

let player: RpgPlayer
let server: any
let client: any
let fixture: any

beforeEach(async () => {
  fixture = await testing(
    myModule, // Module (can be a single module or array)
    { /* client config */ }, // Client configuration
    { /* server config */ }  // Server configuration
  )
  
  client = await fixture.createClient()
  player = await client.waitForMapChange('test-map') // Wait for initial map change
  server = client.server
})

afterEach(async () => {
  await fixture.clear() // Clean up after each test
})

test('Test player parameters', () => {
  expect(player.hp).toBeGreaterThan(0)
  expect(player.sp).toBeGreaterThan(0)
})

test('Test server-side logic', () => {
  // Access server methods
  const players = server.subRoom.players()
  expect(players).toHaveProperty(player.playerId)
})
```

## Testing Player Actions

You can test player actions and server hooks:

```typescript
import { testing } from '@rpgjs/testing'
import { beforeEach, afterEach, test, expect } from 'vitest'
import { RpgPlayer } from '@rpgjs/server'

let player: RpgPlayer
let fixture: any

beforeEach(async () => {
  fixture = await testing()
  const client = await fixture.createClient()
  player = client.player
})

afterEach(async () => {
  await fixture.clear()
})

test('Player can move', async () => {
  const initialX = player.position.x
  
  // Simulate movement
  player.move({ x: 10, y: 0 })
  
  // Wait for movement to complete
  await new Promise(resolve => setTimeout(resolve, 100))
  
  expect(player.position.x).toBeGreaterThan(initialX)
})

test('Player can use items', () => {
  // Add an item to inventory
  player.addItem('potion', 1)
  
  // Use the item
  player.useItem('potion')
  
  expect(player.getItem('potion')).toBeUndefined()
})
```

## Testing Events and Hooks

Test server-side hooks and events:

```typescript
import { testing } from '@rpgjs/testing'
import { defineModule, type RpgServer } from '@rpgjs/server'
import type { RpgClient } from '@rpgjs/client'
import { beforeEach, afterEach, test, expect, vi } from 'vitest'
import { RpgPlayer } from '@rpgjs/server'

const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: 'test-map',
      file: '',
    },
  ],
  player: {
    async onConnected(player) {
      await player.changeMap('test-map', { x: 100, y: 100 })
      player.setVariable('connected', true)
    },
    onLevelUp(player) {
      player.setVariable('leveledUp', true)
    }
  }
})

const clientModule = defineModule<RpgClient>({})

const testModule = [{ server: serverModule, client: clientModule }]

let player: RpgPlayer
let fixture: any

beforeEach(async () => {
  fixture = await testing(testModule)
  const client = await fixture.createClient()
  player = await client.waitForMapChange('test-map')
})

afterEach(async () => {
  await fixture.clear()
})

test('onConnected hook was called', () => {
  expect(player.getVariable('connected')).toBe(true)
})

test('onLevelUp hook is called when leveling up', () => {
  const initialLevel = player.level
  player.level++
  
  expect(player.getVariable('leveledUp')).toBe(true)
})
```

## Testing Map Changes

You can test map changes and verify that players correctly transition between maps. The testing fixture provides a `waitForMapChange()` helper method to wait for map transitions.

### Basic Map Change Test

First, define maps in your server module and set up an initial map change:

```typescript
import { testing } from '@rpgjs/testing'
import { defineModule, RpgPlayer, RpgServer } from '@rpgjs/server'
import { RpgClient } from '@rpgjs/client'
import { beforeEach, test, expect } from 'vitest'

// Define server module with multiple maps
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
  player: {
    async onConnected(player) {
      // Start player on map1
      await player.changeMap('map1', { x: 100, y: 100 })
    },
    onJoinMap(player) {
      console.log('Player joined map:', player.getCurrentMap()?.id)
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
  const myModule = [{
    server: serverModule,
    client: clientModule
  }]
  
  fixture = await testing(myModule)
  client = await fixture.createClient()
  player = await client.waitForMapChange('map1')
})

afterEach(async () => {
  await fixture.clear()
})

test('Player can change map', async () => {
  // Player is already on map1 from beforeEach (waitForMapChange was called there)
  const initialMap = player.getCurrentMap()
  expect(initialMap).toBeDefined()
  expect(initialMap?.id).toBe('map1')
  
  // Change to another map
  const result = await player.changeMap('map2', { x: 200, y: 200 })
  expect(result).toBe(true)
  
  // Wait for map change to complete
  // Always assign the result back to player to get the updated instance
  player = await client.waitForMapChange('map2')
  
  const newMap = player.getCurrentMap()
  expect(newMap).toBeDefined()
  expect(newMap?.id).toBe('map2')
  
  // Verify player position on new map
  expect(player.x()).toBe(200)
  expect(player.y()).toBe(200)
})
```

### Using `waitForMapChange()`

The `waitForMapChange()` method is available on the client object returned by `createClient()`. It:

- Polls the player's current map until it matches the expected map ID
- Returns a Promise that resolves with the **updated player instance**
- Throws an error if the timeout is exceeded (default: 5000ms)

**Important:** Always assign the returned value to your player variable, as it returns an updated player instance:

```typescript
// Wait for player to be on map1 (default timeout: 5000ms)
// Note: Assign the result back to player to get the updated instance
player = await client.waitForMapChange('map1')

// Wait with custom timeout (in milliseconds)
player = await client.waitForMapChange('map2', 10000)

// Example: Wait for initial map change after onConnected
beforeEach(async () => {
  fixture = await testing(myModule)
  client = await fixture.createClient()
  // onConnected changes map, so wait for it
  player = await client.waitForMapChange('test-map')
})
```

### Testing Map Hooks

You can test hooks that fire when players join maps:

```typescript
const serverModule = defineModule<RpgServer>({
  maps: [
    { id: 'map1', file: '' },
    { id: 'map2', file: '' }
  ],
  player: {
    async onConnected(player) {
      await player.changeMap('map1')
    },
    onJoinMap(player) {
      const mapId = player.getCurrentMap()?.id
      player.setVariable('lastMapJoined', mapId)
    }
  }
})

test('onJoinMap hook is called when changing maps', async () => {
  const fixture = await testing(myModule)
  const client = await fixture.createClient()
  
  // Wait for initial map (assign result to get updated player)
  let player = await client.waitForMapChange('map1')
  expect(player.getVariable('lastMapJoined')).toBe('map1')
  
  // Change map and verify hook was called
  await player.changeMap('map2')
  player = await client.waitForMapChange('map2')
  expect(player.getVariable('lastMapJoined')).toBe('map2')
  
  await fixture.clear()
})
```

## Testing Multiple Clients

You can create multiple clients to test multiplayer scenarios:

```typescript
import { testing } from '@rpgjs/testing'
import { beforeEach, afterEach, test, expect } from 'vitest'

let fixture: any

beforeEach(async () => {
  fixture = await testing()
})

afterEach(async () => {
  await fixture.clear()
})

test('Multiple players can exist', async () => {
  const client1 = await fixture.createClient()
  const client2 = await fixture.createClient()
  
  expect(client1.playerId).not.toBe(client2.playerId)
  expect(client1.server).toBe(client2.server) // Same server instance
  
  const players = client1.server.subRoom.players()
  expect(Object.keys(players)).toHaveLength(2)
})
```

## Helper Functions

### `provideTestingLoadMap()`

This function provides a mock map loader for testing. It's automatically included when using `testing()`, but you can use it directly if needed:

```typescript
import { provideTestingLoadMap } from '@rpgjs/testing'

// Returns a provider that mocks map loading
const mapLoaderProvider = provideTestingLoadMap()
```

### `waitForSyncComplete()`

Waits for server-client synchronization to complete. Useful when testing client-side state after server-side changes:

```typescript
import { waitForSyncComplete } from '@rpgjs/testing'

// After making server-side changes
player.addItem('potion', 5)
await waitForSyncComplete(player, client.client)

// Now test client-side state
const clientPlayer = client.client.sceneMap.players()[player.id]
expect(clientPlayer.items()).toBeDefined()
```

## Cleanup and Test Isolation

### Using `fixture.clear()`

It's recommended to call `fixture.clear()` in an `afterEach` hook to ensure proper cleanup between tests. This clears all server and client instances, caches, and resets the DOM:

```typescript
let fixture: any

beforeEach(async () => {
  fixture = await testing(myModule)
  const client = await fixture.createClient()
  player = client.player
})

afterEach(async () => {
  await fixture.clear() // Clean up after each test
})
```

This ensures:
- No state leaks between tests
- All server and client instances are properly destroyed
- DOM is reset to a clean state
- Injection contexts are cleared

## Testing Database Items

### Defining Items in Module Database

You can define items, weapons, and armors directly in your server module's `database` property:

```typescript
const serverModule = defineModule<RpgServer>({
  database: {
    TestPotion: {
      id: 'TestPotion',
      name: 'Test Potion',
      description: 'Restores 100 HP',
      price: 200,
      hpValue: 100,
      consumable: true,
      _type: 'item' as const,
    },
    TestSword: {
      name: 'Test Sword',
      description: 'A basic sword',
      price: 500,
      atk: 50,
      _type: 'weapon' as const,
    },
  },
  player: {
    async onConnected(player) {
      await player.changeMap('test-map', { x: 100, y: 100 })
    },
  },
})
```

### Adding Items Dynamically to Maps

You can also add items to a map's database dynamically using `addInDatabase()`:

```typescript
test('should add item dynamically', () => {
  const customItem = {
    id: 'custom-item',
    name: 'Custom Item',
    price: 100,
    _type: 'item' as const,
  }
  
  // Add item to current map's database
  player.getCurrentMap()?.addInDatabase('custom-item', customItem)
  
  // Now you can use it
  const item = player.addItem('custom-item', 1)
  expect(item).toBeDefined()
})
```

## Synchronization Utilities

### `waitForSyncComplete()`

When you make server-side changes (like adding items, changing player state), you may need to wait for the synchronization to complete before testing client-side state:

```typescript
import { waitForSyncComplete } from '@rpgjs/testing'

test('should sync item to client', async () => {
  // Make a server-side change
  player.addItem('TestPotion', 5)
  
  // Wait for sync to complete
  await waitForSyncComplete(player, client.client)
  
  // Now you can safely test client-side state
  const clientPlayer = client.client.sceneMap.players()[player.id]
  expect(clientPlayer.items()).toBeDefined()
})
```

## Best Practices

1. **Use `beforeEach`**: Create a fresh fixture and client for each test to ensure isolation
2. **Use `afterEach` with `fixture.clear()`**: Always clean up after each test to prevent state leaks
3. **Test modules separately**: Create focused tests for individual modules
4. **Use async/await**: The `testing()` and `createClient()` functions are async
5. **Wait for map changes**: Use `waitForMapChange()` after `onConnected` or `changeMap()` calls
6. **Assign player from `waitForMapChange()`**: Always assign the returned value to get the updated player instance
7. **Mock external dependencies**: Use Vitest mocks for external services or APIs
8. **Define items in database**: Use the module's `database` property for test items

## Example: Complete Test Suite

```typescript
import { testing } from '@rpgjs/testing'
import { beforeEach, afterEach, describe, test, expect } from 'vitest'
import { RpgPlayer, MAXHP_CURVE, MAXSP_CURVE, MAXHP, MAXSP } from '@rpgjs/server'
import { defineModule, type RpgServer } from '@rpgjs/server'
import type { RpgClient } from '@rpgjs/client'

describe('Player Parameters', () => {
  let player: RpgPlayer
  let fixture: any

  beforeEach(async () => {
    const serverModule = defineModule<RpgServer>({
      maps: [
        {
          id: 'test-map',
          file: '',
        },
      ],
      player: {
        async onConnected(player) {
          await player.changeMap('test-map', { x: 100, y: 100 })
        },
      },
    })

    const clientModule = defineModule<RpgClient>({})

    const myModule = [{ server: serverModule, client: clientModule }]

    fixture = await testing(myModule)
    const client = await fixture.createClient()
    player = await client.waitForMapChange('test-map')
  })

  afterEach(async () => {
    await fixture.clear()
  })

  test('Player has correct initial HP', () => {
    expect(player.hp).toBe(MAXHP_CURVE.start)
  })

  test('Player has correct initial SP', () => {
    expect(player.sp).toBe(MAXSP_CURVE.start)
  })

  test('Player has correct MaxHP parameter', () => {
    expect(player.param[MAXHP]).toBe(MAXHP_CURVE.start)
  })

  test('Player has correct MaxSP parameter', () => {
    expect(player.param[MAXSP]).toBe(MAXSP_CURVE.start)
  })
})
```

## Customizing Map Configuration in Tests

By default, `testing()` uses `provideTestingLoadMap()` which provides maps with default dimensions (1024x768) and a minimal mock component. If you need custom map configuration, you can pass your own `provideLoadMap` in `clientConfig.providers`:

```typescript
import { provideLoadMap } from '@rpgjs/client'

const fixture = await testing(
  [myModule],
  {
    providers: [
      provideLoadMap((mapId) => {
        return {
          id: mapId,
          data: { 
            width: 2048, 
            height: 1536,
            hitboxes: []
          },
          component: MyCustomComponent,
          width: 2048,
          height: 1536
        }
      })
    ]
  }
)
```

If you don't provide `provideLoadMap`, the default `provideTestingLoadMap()` will be used automatically.

## Troubleshooting

### Tests fail with WebGL errors

Make sure you've configured Vitest to use the setup file from `@rpgjs/testing`:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['@rpgjs/testing/dist/setup.js']
  }
})
```

### Player is undefined

Ensure you're calling `createClient()` and accessing `client.player` after the client is created:

```typescript
const client = await fixture.createClient()
const player = client.player // Access via getter
```

### Module hooks not being called

Verify that your modules are correctly structured and passed to the `testing()` function:

```typescript
const fixture = await testing([myModule]) // Don't forget the array
```

### Map component errors

If you see errors about missing map components or hitbox requirements, make sure you're either:
- Using the default `provideTestingLoadMap()` (automatically added if no custom `provideLoadMap` is provided)
- Or providing a complete `provideLoadMap` with `component`, `width`, `height`, and `data` properties
