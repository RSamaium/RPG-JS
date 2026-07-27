---
title: "Move Commands"
description: "Movement APIs, movement strategies, and move route helpers."
---

# Move Commands

Movement APIs, movement strategies, and move route helpers.

## Members

- [addMovement](#addmovement)
- [addMovement](#addmovement)
- [animationFixed](#animationfixed)
- [applyIceMovement](#applyicemovement)
- [applyIceMovement](#applyicemovement)
- [breakRoutes](#breakroutes)
- [clearAllPlayerStates](#clearallplayerstates)
- [clearMovements](#clearmovements)
- [clearPlayerState](#clearplayerstate)
- [dash](#dash)
- [dash](#dash)
- [directionFixed](#directionfixed)
- [followPath](#followpath)
- [followPath](#followpath)
- [frequency](#frequency)
- [frequencyRatio](#frequencyratio)
- [getActiveMovements](#getactivemovements)
- [hasActiveMovements](#hasactivemovements)
- [infiniteMoveRoute](#infinitemoveroute)
- [knockback](#knockback)
- [knockback](#knockback)
- [moveRoutes](#moveroutes)
- [moveTo](#moveto)
- [moveTo](#moveto)
- [onStuck](#onstuck)
- [oscillate](#oscillate)
- [oscillate](#oscillate)
- [removeMovement](#removemovement)
- [replayRoutes](#replayroutes)
- [shootProjectile](#shootprojectile)
- [shootProjectile](#shootprojectile)
- [stopMoveTo](#stopmoveto)
- [stuckThreshold](#stuckthreshold)
- [stuckTimeout](#stucktimeout)
- [through](#through)
- [throughEvent](#throughevent)
- [throughOtherPlayer](#throughotherplayer)
- [WithMoveManager](#withmovemanager)

## addMovement

Add a movement strategy to this entity

Returns a Promise that resolves when the movement completes (when `isFinished()` returns true).
If the strategy doesn't implement `isFinished()`, the Promise resolves immediately.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
addMovement(strategy: MovementStrategy, options?: MovementOptions): Promise<void>
```

### Parameters

- `strategy`: `MovementStrategy`
- `options?`: `MovementOptions`

### Returns

Promise that resolves when the movement completes

### Examples

```ts
// Fire and forget
player.addMovement(new LinearMove({ x: 1, y: 0 }, 200));

// Wait for completion
await player.addMovement(new Dash(10, { x: 1, y: 0 }, 200));
console.log('Dash completed!');

// With callbacks
await player.addMovement(new Knockback({ x: -1, y: 0 }, 5, 300), {
  onStart: () => console.log('Knockback started'),
  onComplete: () => console.log('Knockback completed')
});
```

## addMovement

Add a custom movement strategy to this entity

Returns a Promise that resolves when the movement completes.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
addMovement(strategy: MovementStrategy, options?: MovementOptions): Promise<void>
```

### Parameters

- `strategy`: `MovementStrategy`
- `options?`: `MovementOptions`

### Returns

Promise that resolves when the movement completes

## animationFixed

Whether animation changes are locked (prevents automatic animation changes)

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `IMoveManager`

### Signature

```ts
animationFixed: boolean
```

## applyIceMovement

Apply ice movement physics

Simulates slippery surface physics where the entity accelerates gradually
and has difficulty stopping. The maximum speed is based on the player's
base speed multiplied by a speed factor.

With default speed=4 and factor=1: maxSpeed = 4 (same as original default)

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
applyIceMovement(direction: { x: number, y: number }, speedFactor?: number): void
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `speedFactor?`: `number`

### Examples

```ts
// Normal ice physics
player.applyIceMovement({ x: 1, y: 0 });

// Fast ice sliding
player.applyIceMovement({ x: 0, y: 1 }, 1.5);
```

## applyIceMovement

Apply ice movement physics

Max speed is calculated from the player's base speed multiplied by the speedFactor.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
applyIceMovement(direction: { x: number, y: number }, speedFactor?: number): void
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `speedFactor?`: `number`

## breakRoutes

Stop an infinite movement

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
breakRoutes(force?: boolean): void
```

### Parameters

- `force?`: `boolean`

## clearAllPlayerStates

Clears all player movement states

Useful for cleanup during server shutdown or when resetting game state.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `MoveList`

### Signature

```ts
clearAllPlayerStates(): void
```

### Examples

```ts
// Clear all states on server shutdown
Move.clearAllPlayerStates();
```

## clearMovements

Remove all active movement strategies from this entity

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
clearMovements(): void
```

## clearPlayerState

Clears the movement state for a specific player

Should be called when a player changes map or is destroyed to prevent
memory leaks and stale stuck detection data.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `MoveList`

### Signature

```ts
clearPlayerState(playerId: string): void
```

### Parameters

- `playerId`: `string`

### Examples

```ts
// Clear state when player leaves map
Move.clearPlayerState(player.id);
```

## dash

Perform a dash movement in the specified direction

Creates a burst of velocity for a fixed duration. The total speed is calculated
by adding the player's base speed (`this.speed`) to the additional dash speed.
This ensures faster players also dash faster proportionally.

With default speed=4 and additionalSpeed=4: total = 8 (same as original default)

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
dash(direction: { x: number, y: number }, additionalSpeed?: number, duration?: number, options?: MovementOptions): Promise<void>
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `additionalSpeed?`: `number`
- `duration?`: `number`
- `options?`: `MovementOptions`

### Returns

Promise that resolves when the dash completes

### Examples

```ts
// Dash to the right and wait for completion
await player.dash({ x: 1, y: 0 });

// Powerful dash with callbacks
await player.dash({ x: 0, y: -1 }, 12, 300, {
  onStart: () => console.log('Dash started!'),
  onComplete: () => console.log('Dash finished!')
});
```

## dash

Perform a dash movement in the specified direction

The total speed is calculated by adding the player's base speed to the additional speed.
Returns a Promise that resolves when the dash completes.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
dash(direction: { x: number, y: number }, additionalSpeed?: number, duration?: number, options?: MovementOptions): Promise<void>
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `additionalSpeed?`: `number`
- `duration?`: `number`
- `options?`: `MovementOptions`

### Returns

Promise that resolves when the dash completes

## directionFixed

Whether direction changes are locked (prevents automatic direction changes)

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `IMoveManager`

### Signature

```ts
directionFixed: boolean
```

## followPath

Follow a sequence of waypoints

Makes the entity move through a list of positions at a speed calculated
from the player's base speed. The `speedMultiplier` allows adjusting
the travel speed relative to the player's normal movement speed.

With default speed=4 and multiplier=0.5: speed = 2 (same as original default)

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
followPath(waypoints: Array<{ x: number, y: number }>, speedMultiplier?: number, loop?: boolean): void
```

### Parameters

- `waypoints`: `Array<{ x: number, y: number }>`
- `speedMultiplier?`: `number`
- `loop?`: `boolean`

### Examples

```ts
// Follow a patrol path at normal speed
const patrol = [
  { x: 100, y: 100 },
  { x: 200, y: 100 },
  { x: 200, y: 200 }
];
player.followPath(patrol, 1, true); // Loop at full speed

// Slow walk through waypoints
player.followPath(waypoints, 0.25, false);
```

## followPath

Follow a sequence of waypoints

Speed is calculated from the player's base speed multiplied by the speedMultiplier.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
followPath(waypoints: Array<{ x: number, y: number }>, speedMultiplier?: number, loop?: boolean): void
```

### Parameters

- `waypoints`: `Array<{ x: number, y: number }>`
- `speedMultiplier?`: `number`
- `loop?`: `boolean`

## frequency

Frequency for movement timing (milliseconds between movements)

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `IMoveManager`

### Signature

```ts
frequency: number
```

## frequencyRatio

Multiplier applied to the player's frequency delay between route segments.

The default keeps legacy route timing. Lower values are useful for generated
routes that need smoother visual motion, such as Studio random movement.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `MoveRoutesOptions`

### Signature

```ts
frequencyRatio: number
```

## getActiveMovements

Get all active movement strategies for this entity

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
getActiveMovements(): MovementStrategy[]
```

### Returns

Array of active movement strategies

## hasActiveMovements

Check if this entity has any active movement strategies

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
hasActiveMovements(): boolean
```

### Returns

True if entity has active movements

## infiniteMoveRoute

Give a path that repeats itself in a loop to a character

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
infiniteMoveRoute(routes: Routes, options?: MoveRoutesOptions): void
```

### Parameters

- `routes`: `Routes`
- `options?`: `MoveRoutesOptions`

## knockback

Apply knockback effect in the specified direction

Pushes the entity with an initial force that decays over time.
Returns a Promise that resolves when the knockback completes **or is cancelled**.

## Design notes
- The underlying physics `MovementManager` can cancel strategies via `remove()`, `clear()`,
  or `stopMovement()` **without resolving the Promise** returned by `add()`.
- For this reason, this method considers the knockback finished when either:
  - the `add()` promise resolves (normal completion), or
  - the strategy is no longer present in the active movements list (cancellation).
- When multiple knockbacks overlap, `directionFixed` and `animationFixed` are restored
  only after **all** knockbacks have finished (including cancellations).

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
knockback(direction: { x: number, y: number }, force?: number, duration?: number, options?: MovementOptions): Promise<void>
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `force?`: `number`
- `duration?`: `number`
- `options?`: `MovementOptions`

### Returns

Promise that resolves when the knockback completes or is cancelled

### Examples

```ts
// Simple knockback (await is optional)
await player.knockback({ x: 1, y: 0 }, 5, 300);

// Overlapping knockbacks: flags are restored only after the last one ends
player.knockback({ x: -1, y: 0 }, 5, 300);
player.knockback({ x: 0, y: 1 }, 3, 200);

// Cancellation (e.g. map change) will still restore fixed flags
// even if the underlying movement strategy promise is never resolved.
```

## knockback

Apply knockback effect in the specified direction

The force is scaled by the player's base speed for consistent behavior.
Returns a Promise that resolves when the knockback completes.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
knockback(direction: { x: number, y: number }, force?: number, duration?: number, options?: MovementOptions): Promise<void>
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `force?`: `number`
- `duration?`: `number`
- `options?`: `MovementOptions`

### Returns

Promise that resolves when the knockback completes

## moveRoutes

Give an itinerary to follow using movement strategies

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
moveRoutes(routes: Routes, options?: MoveRoutesOptions): Promise<boolean>
```

### Parameters

- `routes`: `Routes`
- `options?`: `MoveRoutesOptions`

### Returns

Promise that resolves when all routes are completed

## moveTo

Move toward a target player or position using local obstacle avoidance

Uses the `SeekAvoid` strategy to navigate toward the target while avoiding blocking
hitboxes and events locally. It does not compute a full path.
The movement speed is based on the player's current `speed` and `frequency` settings,
scaled appropriately.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
moveTo(target: RpgCommonPlayer | { x: number, y: number }): void
```

### Parameters

- `target`: `RpgCommonPlayer | { x: number, y: number }`

### Examples

```ts
// Move toward another player
player.moveTo(otherPlayer);

// Move toward a specific position
player.moveTo({ x: 200, y: 150 });
```

## moveTo

Move toward a target player or position using local obstacle avoidance

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
moveTo(target: RpgCommonPlayer | { x: number, y: number }): void
```

### Parameters

- `target`: `RpgCommonPlayer | { x: number, y: number }`

## onStuck

Callback function called when the player gets stuck (cannot move towards target)

This callback is triggered when the player is trying to move but cannot make progress
towards the target position, typically due to obstacles or collisions.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `MoveRoutesOptions`

### Signature

```ts
onStuck: (player: RpgPlayer, target: { x: number; y: number }, currentPosition: { x: number; y: number }) => boolean | void
```

### Parameters

- `` - The current position of the player

### Returns

If true, the route will continue; if false, the route will be cancelled

### Examples

```ts
await player.moveRoutes([Move.right()], {
  onStuck: (player, target, currentPos) => {
    console.log('Player is stuck!');
    return false; // Cancel the route
  }
});
```

## oscillate

Apply oscillating movement pattern

Creates a back-and-forth movement along the specified axis. The movement
oscillates sinusoidally between -amplitude and +amplitude from the starting position.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
oscillate(direction: { x: number, y: number }, amplitude?: number, period?: number): void
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `amplitude?`: `number`
- `period?`: `number`

### Examples

```ts
// Horizontal oscillation
player.oscillate({ x: 1, y: 0 }, 100, 3000);

// Diagonal bobbing motion
player.oscillate({ x: 1, y: 1 }, 30, 1000);
```

## oscillate

Apply oscillating movement pattern

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
oscillate(direction: { x: number, y: number }, amplitude?: number, period?: number): void
```

### Parameters

- `direction`: `{ x: number, y: number }`
- `amplitude?`: `number`
- `period?`: `number`

## removeMovement

Remove a specific movement strategy from this entity

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
removeMovement(strategy: MovementStrategy): boolean
```

### Parameters

- `strategy`: `MovementStrategy`

### Returns

True if the strategy was found and removed

## replayRoutes

Replay an infinite movement

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
replayRoutes(): void
```

## shootProjectile

Shoot a projectile in the specified direction

Creates a projectile with ballistic trajectory. The speed is calculated
from the player's base speed multiplied by a speed factor.

With default speed=4 and factor=50: speed = 200 (same as original default)

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `WithMoveManagerClass`

### Signature

```ts
shootProjectile(type: ProjectileType, direction: { x: number, y: number }, speedFactor?: number): void
```

### Parameters

- `type`: `ProjectileType`
- `direction`: `{ x: number, y: number }`
- `speedFactor?`: `number`

### Examples

```ts
// Straight projectile
player.shootProjectile(ProjectileType.Straight, { x: 1, y: 0 });

// Fast arc projectile
player.shootProjectile(ProjectileType.Arc, { x: 1, y: -0.5 }, 75);
```

## shootProjectile

Shoot a projectile in the specified direction

Speed is calculated from the player's base speed multiplied by the speedFactor.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
shootProjectile(type: ProjectileType, direction: { x: number, y: number }, speedFactor?: number): void
```

### Parameters

- `type`: `ProjectileType`
- `direction`: `{ x: number, y: number }`
- `speedFactor?`: `number`

## stopMoveTo

Stop the current moveTo behavior

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `method`
- Defined in: `IMoveManager`

### Signature

```ts
stopMoveTo(): void
```

## stuckThreshold

Minimum distance change in pixels to consider movement progress (default: 1 pixel)

If the player moves less than this distance over the stuckTimeout period, they are considered stuck.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `MoveRoutesOptions`

### Signature

```ts
stuckThreshold: number
```

## stuckTimeout

Time in milliseconds to wait before considering the player stuck (default: 500ms)

The player must be unable to make progress for this duration before onStuck is called.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `MoveRoutesOptions`

### Signature

```ts
stuckTimeout: number
```

## through

Whether the player goes through all characters (players and events)

When `true`, the player can walk through all character entities (both players and events)
without collision. Walls and obstacles still block movement.
This takes precedence over `throughOtherPlayer` and `throughEvent`.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `IMoveManager`

### Signature

```ts
through: boolean
```

### Default

```ts
false
```

### Examples

```ts
// Enable ghost mode - pass through all characters
player.through = true;

// Disable ghost mode
player.through = false;
```

## throughEvent

Whether the player passes through events (NPCs, objects)

When `true`, the player can walk through event entities without collision.
This is useful for NPCs that shouldn't block player movement.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `IMoveManager`

### Signature

```ts
throughEvent: boolean
```

### Default

```ts
false
```

### Examples

```ts
// Allow passing through events
player.throughEvent = true;

// Block passage through events
player.throughEvent = false;
```

## throughOtherPlayer

Whether the player passes through other players

When `true`, the player can walk through other player entities without collision.
This is useful for busy areas where players shouldn't block each other.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `property`
- Defined in: `IMoveManager`

### Signature

```ts
throughOtherPlayer: boolean
```

### Default

```ts
true
```

### Examples

```ts
// Disable player-to-player collision
player.throughOtherPlayer = true;

// Enable player-to-player collision
player.throughOtherPlayer = false;
```

## WithMoveManager

Move Manager Mixin

Provides comprehensive movement management capabilities to any class. This mixin handles
various types of movement including target seeking, physics-based movement, route following,
and advanced movement strategies like dashing, knockback, and projectile movement.

- Source: `packages/server/src/Player/MoveManager.ts`
- Kind: `function`

### Signature

```ts
WithMoveManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with movement management methods

### Examples

```ts
class MyPlayer extends WithMoveManager(BasePlayer) {
  constructor() {
    super();
    this.frequency = Frequency.High;
  }
}

const player = new MyPlayer();
player.moveTo({ x: 100, y: 100 });
player.dash({ x: 1, y: 0 }, 8, 200);
```
