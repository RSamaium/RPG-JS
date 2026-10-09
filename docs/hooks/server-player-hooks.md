---
title: "Server Player Hooks"
description: "Guide for Server Player Hooks in RPGJS."
---

# Server Player Hooks

Player hooks allow you to listen to player-specific events and customize player behavior on the server side. These hooks are defined in the `player` property of your server module.

## Usage

```ts
import { RpgPlayer, RpgMap, RpgPlayerHooks, defineModule } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        console.log(`Player ${player.id} connected`)
        player.changeMap('spawn-map')
    },
    onStart(player: RpgPlayer) {
        console.log(`Player ${player.id} started the game`)
    },
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        console.log(`Player ${player.id} joined map ${map.id}`)
    }
}

export default defineModule({
    player
})
```

## Movement and disconnection

`onMove(player)` runs when authoritative physics changes the player's synchronized
x/y position, in both standalone RPG and MMORPG modes. It excludes events and
unchanged positions. Async handlers do not block the physics step; errors are
logged by the runtime.

`onDisconnected(player)` runs when the last active connection for the session
closes, whether the player is in the lobby, a map, or a custom gameplay room.
The room's leave hooks run first. A successful `changeMap()` or `changeRoom()`
transfer closes the source connection without dispatching `onDisconnected`.
The destination connection starts a new connection lifecycle.

```ts
const player: RpgPlayerHooks = {
    onMove(player) {
        console.log(player.id, player.x(), player.y())
    },
    onDisconnected(player) {
        console.log(player.id, 'disconnected')
    }
}
```

## Custom Properties

You can define custom properties that will be synchronized with the client and optionally saved to the database:

```ts
// First, extend the RpgPlayer interface
declare module '@rpgjs/server' {
    export interface RpgPlayer {
        gold: number
        experience: number
        secretData: string
    }
}

const player: RpgPlayerHooks = {
    props: {
        gold: {
            $default: 100,
            $syncWithClient: true,
            $permanent: true
        },
        experience: {
            $default: 0,
            $syncWithClient: true,
            $permanent: true
        },
        secretData: {
            $default: '',
            $syncWithClient: false, // Not sent to client
            $permanent: false       // Not saved to database
        }
    }
}
```

## Available Hooks

## Initializing Default Stats

RPGJS can provide built-in default parameters for a player such as `maxHp`, `maxSp`,
`str`, `int`, `dex`, and `agi`.

Use `player.initializeDefaultStats()` when you want to:

- apply the built-in default parameter curves
- initialize HP/SP from those max values
- ensure the client receives visible HP/SP and parameter values on first game load

Typical usage:

- call it in `onConnected()` if your game starts immediately
- call it in `onStart()` if your game begins after a title screen or another GUI flow

If your player data comes from your own database, a save slot, or a snapshot, do not
call `player.initializeDefaultStats()` after hydration unless you intentionally want to
overwrite those values. In that case, restore your data first and let that state be
synchronized to the client.

If you only want the built-in parameter curves without restoring HP/SP, use
`player.applyDefaultParameters()`.

### onConnected

**Description:** Called when a player connects to the server

**Parameters:**
- `player: RpgPlayer` - The player instance

**Example:**
```ts
const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.initializeDefaultStats()
        console.log(`Welcome ${player.name}!`)
        player.gold = 1000
        player.changeMap('tutorial-map')
        
        // Send welcome message
        player.showText('Welcome to the game!')
    }
}
```

### onLoad

**Description:** Called after a JSON or slot snapshot has been applied to the player.

**Parameters:**
- `player: RpgPlayer` - The hydrated player instance
- `snapshot: RpgPlayerSnapshot` - The resolved snapshot applied to the player

```ts
const player: RpgPlayerHooks = {
    onLoad(player, snapshot) {
        console.log(`Loaded ${player.id}`, snapshot)
    }
}
```

### onSave

**Description:** Called after the snapshot is created and before a slot is persisted.
Calling the legacy `player.save()` overload without a slot only serializes the snapshot
and does not emit this hook.

```ts
const player: RpgPlayerHooks = {
    async onSave(player, snapshot) {
        await auditSave(player.id, snapshot)
    }
}
```

### onJoinMap

**Description:** Called when a player joins a map

**Parameters:**
- `player: RpgPlayer` - The player instance
- `map: RpgMap` - The map instance the player joined

**Example:**
```ts
const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        console.log(`${player.name} entered ${map.name}`)
        
        // Set player position based on map spawn point
        if (map.spawnPoint) {
            player.teleport(map.spawnPoint.x, map.spawnPoint.y)
        }
        
        // Apply map-specific effects
        if (map.id === 'dark-forest') {
            player.addState('darkness')
        }
    }
}
```

### onStart

**Description:** Called when the player starts the game from a GUI interaction

This hook is executed after a GUI interaction when the GUI returns a `data.id` equal to `'start'`.
This is typically used after a title screen or another start menu.

**Parameters:**
- `player: RpgPlayer` - The player instance

**Example:**
```ts
const player: RpgPlayerHooks = {
    async onConnected(player: RpgPlayer) {
        await player.gui('rpg-title-screen').open()
    },

    onStart(player: RpgPlayer) {
        player.initializeDefaultStats()
        player.changeMap('starting-map')
        player.showText('The adventure begins!')
    }
}
```

### onLeaveMap

**Description:** Called when a player leaves a map

**Parameters:**
- `player: RpgPlayer` - The player instance
- `map: RpgMap` - The map instance the player left

**Example:**
```ts
const player: RpgPlayerHooks = {
    onLeaveMap(player: RpgPlayer, map: RpgMap) {
        console.log(`${player.name} left ${map.name}`)
        
        // Remove map-specific effects
        if (map.id === 'dark-forest') {
            player.removeState('darkness')
        }
        
        // Save player progress
        player.save()
    }
}
```

### onInput

**Description:** Called when the server receives an action from the client.

**Parameters:**
- `player: RpgPlayer` - The player instance
- `input: RpgActionInput<unknown>` - Action name and optional custom data

**Example:**
```ts
const player: RpgPlayerHooks = {
    onInput(player, { action, data }) {
        if (action === 'escape') {
            // Open menu
            player.gui('main-menu').open()
        }

        console.log('Custom action data:', data)
    }
}
```

### onLevelUp

**Description:** Called when a player increases one level

**Parameters:**
- `player: RpgPlayer` - The player instance
- `nbLevel: number` - Number of levels gained

**Example:**
```ts
const player: RpgPlayerHooks = {
    onLevelUp(player: RpgPlayer, nbLevel: number) {
        console.log(`${player.name} gained ${nbLevel} level(s)!`)
        
        // Restore health and mana
        player.hp = player.param.maxHp
        player.sp = player.param.maxSp
        
        // Show level up effect
        player.showAnimation('level-up-effect')
        player.showText(`Level Up! You are now level ${player.level}`)
        
        // Grant skill points
        player.skillPoints += nbLevel * 2
    }
}
```

### onSkillChange

**Description:** Called after a player learns or forgets a skill.

**Parameters:**
- `player: RpgPlayer` - The player instance
- `payload.action: 'learn' | 'forget'` - Skill change type
- `payload.skill` - Skill data
- `payload.skillId: string` - Skill identifier
- `payload.source?: string` - Change source, such as `manual`, `level`, or `studio`
- `payload.level?: number` - Level that triggered the change, when available

**Example:**
```ts
const player: RpgPlayerHooks = {
    onSkillChange(player, payload) {
        if (payload.action === 'learn') {
            player.showNotification(`Learned ${payload.skillId}`)
        }
    }
}
```

### onDead

**Description:** Called when a player's HP drops to 0

**Parameters:**
- `player: RpgPlayer` - The player instance

**Example:**
```ts
const player: RpgPlayerHooks = {
    async onDead(player: RpgPlayer) {
        const selection = await player.callGameover({
            title: 'Game Over',
            subtitle: 'Choose your fate',
            entries: [
                { id: 'title', label: 'Title Screen' },
                { id: 'load', label: 'Load Game' }
            ]
        })

        if (selection?.id === 'title') {
            await player.gui('rpg-title-screen').open()
        }

        if (selection?.id === 'load') {
            await player.showLoad()
        }
    }
}
```

### onDisconnected

**Description:** Called when a player leaves the server

**Parameters:**
- `player: RpgPlayer` - The player instance

**Example:**
```ts
const player: RpgPlayerHooks = {
    onDisconnected(player: RpgPlayer) {
        console.log(`${player.name} disconnected`)
        
        // Save player data
        player.save()
        
        // Notify other players
        const map = player.getCurrentMap()
        if (map) {
            map.broadcastToPlayers('showText', [`${player.name} has left the game`])
        }
    }
}
```

### onMove

**Description:** Called when the player's x, y positions change

**Parameters:**
- `player: RpgPlayer` - The player instance

**Example:**
```ts
const player: RpgPlayerHooks = {
    onMove(player: RpgPlayer) {
        // Check for hidden treasures
        const treasures = player.getCurrentMap().getEventsOfType('treasure')
        treasures.forEach(treasure => {
            if (treasure.isHidden && player.distanceTo(treasure) < 16) {
                treasure.reveal()
                player.showText('You found a hidden treasure!')
            }
        })
        
        // Update step counter
        player.stepCount = (player.stepCount || 0) + 1
        
        // Random encounters
        if (player.stepCount % 100 === 0) {
            if (Math.random() < 0.1) { // 10% chance
                player.callBattle('random-encounter')
            }
        }
    }
}
```

### onInShape / onOutShape

**Description:** Called when a player enters or leaves a shape

**Parameters:**
- `player: RpgPlayer` - The player instance
- `shape: RpgShape` - The shape instance

**Example:**
```ts
const player: RpgPlayerHooks = {
    onInShape(player: RpgPlayer, shape: RpgShape) {
        if (shape.name === 'healing-zone') {
            player.addState('regeneration')
            player.showText('You feel rejuvenated...')
        }
        
        if (shape.name === 'danger-zone') {
            player.showText('⚠️ Danger Zone - Proceed with caution!')
        }
    },
    
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        if (shape.name === 'healing-zone') {
            player.removeState('regeneration')
            player.showText('The healing effect fades away.')
        }
    }
}
```

### canChangeMap

**Description:** Determines if a player can change to a specific map

**Parameters:**
- `player: RpgPlayer` - The player instance
- `nextMap: RpgMapChangeTarget` - A descriptor containing the destination map ID

**Returns:**
- `boolean | Promise<boolean>` - Whether the player can change maps

**Example:**
```ts
const player: RpgPlayerHooks = {
    async canChangeMap(player, nextMap) {
        // Check with external service
        const hasPermission = await checkMapPermission(player.id, nextMap.id)
        if (!hasPermission) {
            player.showText('Access denied.')
            return false
        }
        
        return true
    }
}
```

## Complete Example

```ts
import { RpgPlayer, RpgMap, RpgPlayerHooks, defineModule } from '@rpgjs/server'

// Extend player interface
declare module '@rpgjs/server' {
    export interface RpgPlayer {
        gold: number
        experience: number
        stepCount: number
        lastSaveTime: number
    }
}

const player: RpgPlayerHooks = {
    props: {
        gold: { $default: 100 },
        experience: { $default: 0 },
        stepCount: { $default: 0 },
        lastSaveTime: { $default: 0 }
    },
    
    onConnected(player: RpgPlayer) {
        console.log(`🎮 ${player.name} joined the game`)
        player.changeMap('town-square')
        player.showText(`Welcome back, ${player.name}!`)
    },
    
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        console.log(`📍 ${player.name} entered ${map.name}`)
        
        // Auto-save when entering important maps
        if (map.isImportant) {
            player.save('auto')
            player.lastSaveTime = Date.now()
        }
    },
    
    onInput(player: RpgPlayer, { action }) {
        if (action === 'menu') {
            player.gui('inventory').open()
        }
    },
    
    onLevelUp(player: RpgPlayer, nbLevel: number) {
        player.hp = player.param.maxHp
        player.sp = player.param.maxSp
        player.showAnimation('level-up')
        player.showText(`🎉 Level Up! You are now level ${player.level}`)
    },
    
    onMove(player: RpgPlayer) {
        player.stepCount++
        
        // Auto-save every 5 minutes
        const now = Date.now()
        if (now - player.lastSaveTime > 300000) { // 5 minutes
            player.save()
            player.lastSaveTime = now
        }
    },
    
    onDisconnected(player: RpgPlayer) {
        console.log(`👋 ${player.name} left the game`)
        player.save()
    }
}

export default defineModule({
    player
})
``` 
