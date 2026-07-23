---
title: "Server Engine Hooks"
description: "Guide for Server Engine Hooks in RPGJS."
---

# Server Engine Hooks

Server engine hooks allow you to listen to server-level events and customize server behavior. These hooks are defined in the `engine` property of your server module.

## Usage

```ts
import { RpgServerEngine, RpgServerEngineHooks, defineModule } from '@rpgjs/server'

const engine: RpgServerEngineHooks = {
    onStart(server: RpgServerEngine) {
        console.log('Server is starting...')
    },
    onStep(server: RpgServerEngine, metrics) {
        // Called after each queued map tick
        console.log(metrics.durationMs, metrics.pendingInputs)
    },
    auth(server: RpgServerEngine, socket: any) {
        // Custom authentication logic
        const token = socket.handshake.query.token
        if (!token) {
            throw 'Authentication failed: No token provided'
        }
        return 'user-id-123'
    }
}

export default defineModule({
    engine
})
```

## Available Hooks

### onStart

**Description:** Called when the server starts

**Parameters:**
- `server: RpgServerEngine` - The server engine instance

**Example:**
```ts
const engine: RpgServerEngineHooks = {
    onStart(server: RpgServerEngine) {
        console.log('Server started successfully')
        // Initialize global server data
        server.globalData = {
            startTime: Date.now(),
            playerCount: 0
        }
    }
}
```

### onStep

**Description:** Called after each queued map tick has been processed. Empty maps
stop their automatic loop, so observability does not keep an idle room active.

**Parameters:**
- `server: RpgServerEngine` - The server engine instance
- `metrics: RpgServerStepMetrics` - Metrics for the processed map tick:
  - `tick` - Current fixed simulation tick
  - `durationMs` - Wall-clock processing duration, excluding the hook itself
  - `scheduledDeltaMs` - Delta passed to the queued tick
  - `queuedDeltaMs` - Delta that arrived during processing and remains queued
  - `fixedSteps` - Number of fixed simulation steps executed
  - `pendingInputs` - Total unprocessed player inputs after the tick

Handlers that only accept `server` remain compatible. Async handlers are awaited
in the tick queue. If a handler throws or rejects, RPGJS logs the error for the
automatic loop and retries queued simulation work on a later tick. Avoid network
I/O here because it directly increases the server backlog.

**Example:**
```ts
import type { RpgServerEngineHooks, RpgServerStepMetrics } from '@rpgjs/server'

const window = {
    startedAt: Date.now(),
    ticks: 0,
    durationMs: 0,
    maxQueuedDeltaMs: 0,
    maxPendingInputs: 0
}

const engine: RpgServerEngineHooks = {
    onStep(server, metrics: RpgServerStepMetrics) {
        window.ticks += metrics.fixedSteps
        window.durationMs += metrics.durationMs
        window.maxQueuedDeltaMs = Math.max(
            window.maxQueuedDeltaMs,
            metrics.queuedDeltaMs
        )
        window.maxPendingInputs = Math.max(
            window.maxPendingInputs,
            metrics.pendingInputs
        )

        if (Date.now() - window.startedAt >= 10_000) {
            // Enqueue this aggregate for an out-of-band exporter instead of
            // performing analytics or network I/O on every server tick.
            metricsQueue.push({
                mapId: server.getCurrentRoomId(),
                ...window
            })
            window.startedAt = Date.now()
            window.ticks = 0
            window.durationMs = 0
            window.maxQueuedDeltaMs = 0
            window.maxPendingInputs = 0
        }
    }
}
```

### auth

**Description:** Flexible authentication function for player connections. This function is called during each RPGJS room connection and should handle credential verification before the player is allowed to join the room.

**Parameters:**
- `server: RpgServerEngine` - The server engine instance
- `socket: any` - The socket instance for the connecting player

**Returns:**
- `Promise<string> | string | undefined` - Player's stable public identifier if authentication succeeds, or undefined to generate an ID automatically

**Throws:**
- `string` - Error message if authentication fails

The returned identifier becomes the player `publicId` used by RPGJS and Signe room user collections. In MMORPG mode, the hook is called when the client connects to the lobby and again when it reconnects to map rooms. Send the same token on each connection and return the same id for the same account.

For browser MMORPG clients, pass the token through `provideMmorpg({ query })`; see [Authentication](/advanced/auth).

**Example:**
```ts
const engine: RpgServerEngineHooks = {
    async auth(server: RpgServerEngine, socket: any) {
        const token = socket.handshake.query.token
        
        if (!token) {
            throw 'Authentication failed: No token provided'
        }
        
        try {
            // Verify token with your authentication service
            const user = await verifyJWTToken(token)
            return user.id
        } catch (error) {
            throw 'Authentication failed: Invalid token'
        }
    }
}
```

## Engine Runtime API

The `server` argument is an `RpgServerEngine` instance. It exposes stable helpers
for reading the current RPGJS room without depending on low-level Signe internals.

```ts
const engine: RpgServerEngineHooks = {
    onStart(server: RpgServerEngine) {
        const room = server.getCurrentRoom()
        const roomInfo = server.getCurrentRoomInfo()
        const globalConfig = server.globalConfig

        console.log(roomInfo?.id, roomInfo?.kind, globalConfig)
    }
}
```

### getCurrentRoom

Returns the current RPGJS room instance, such as `LobbyRoom` or `RpgMap`.

```ts
const room = server.getCurrentRoom()
```

This is different from `server.room`, which is the low-level Signe/Party room
wrapper.

### getCurrentRoomInfo

Returns stable metadata for the current room:

```ts
const info = server.getCurrentRoomInfo()

if (info?.kind === 'map') {
    console.log(`Current map room: ${info.name}`)
}
```

The returned object contains:

- `id`: full room id, such as `lobby-1` or `map-town`
- `kind`: `lobby`, `map`, or `unknown`
- `name`: room id without the RPGJS prefix
- `className`: runtime room class name
- `playersCount`: number of players in the room when available
- `autoSync`: whether automatic sync is enabled
- `hasDatabase`: whether the room exposes a database signal

You can also use `getCurrentRoomId()` and `getCurrentRoomKind()` when you only
need one value.

### globalConfig

`server.globalConfig` is provided for compatibility with older server-engine
usage:

```ts
const globalConfig = server.globalConfig
```

In map rooms, it returns the current map's `globalConfig`. In lobby rooms or
before room initialization, it returns the last assigned value or `{}`.

### app and io

`server.app` and `server.io` are optional compatibility handles. RPGJS v5 does
not create Express or socket.io automatically, but custom Node entries can assign
these properties when migrating older code:

```ts
server.app = app
server.io = wsServer
```

## Complete Example

```ts
import { RpgServerEngine, RpgServerEngineHooks, defineModule } from '@rpgjs/server'
import { verifyJWTToken } from './auth-service'

const engine: RpgServerEngineHooks = {
    onStart(server: RpgServerEngine) {
        console.log('🚀 RPG Server started')
        server.globalData = {
            startTime: Date.now(),
            events: []
        }
    },
    
    onStep(server: RpgServerEngine) {
        // Process global events every frame
        if (server.globalData.events.length > 0) {
            const event = server.globalData.events.shift()
            console.log('Processing global event:', event)
        }
    },
    
    async auth(server: RpgServerEngine, socket: any) {
        const { token, guestMode } = socket.handshake.query
        
        if (guestMode === 'true') {
            // Allow guest connections
            return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        
        if (!token) {
            throw 'Authentication required'
        }
        
        try {
            const user = await verifyJWTToken(token)
            console.log(`User ${user.username} authenticated`)
            return user.id
        } catch (error) {
            throw 'Invalid authentication token'
        }
    }
}

export default defineModule({
    engine
})
```
