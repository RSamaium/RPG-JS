---
title: "Custom Gameplay Rooms"
description: "Build synchronized, map-independent RPGJS rooms with custom CanvasEngine scenes."
---

# Custom Gameplay Rooms

Custom gameplay rooms are server-authoritative sessions that keep RPGJS players,
state synchronization, actions, GUI messages, and session transfer without loading
a Tiled map or starting map physics. They fit turn-based battles, card tables,
lobbies, matchmaking screens, and other non-spatial game modes.

Maps remain unchanged. Use `player.changeMap()` for maps and
`player.changeRoom()` for custom rooms.

## Runtime model

| Concern | Owner |
| --- | --- |
| Players, authorization, actions, and persistent room state | Server |
| Synchronized `players` and public `state` projections | RPGJS room synchronization |
| Scene layout, input, animations, and local effects | Client CanvasEngine component |
| Map loading, movement, collisions, and map physics | Disabled while the custom scene is active |

The same API works in standalone and MMORPG modes. In standalone mode, the
server room runs in the browser alongside the client. In MMORPG mode, it runs
only in the server bundle and remains authoritative. Keep reusable features in
separate server and client entry points so server-only code is not imported by
the MMORPG browser bundle.

## Define the server room

Create a room class, declare a unique `kind` and path, then register it in the
server entry:

```ts
import {
  createServer,
  provideServerModules,
  provideServerRooms,
  RpgGameplayRoom,
  RpgRoom,
  RpgRoomAction,
  type RpgPlayer,
} from "@rpgjs/server"

type BattleState = {
  turn: number
  lastPlayerId: string | null
}

@RpgRoom<BattleState>({
  kind: "battle",
  path: "battle-{id}",
  persistState: true,
  initialState: () => ({ turn: 1, lastPlayerId: null }),
})
export class BattleRoom extends RpgGameplayRoom<BattleState> {
  @RpgRoomAction("battle.nextTurn")
  nextTurn(player: RpgPlayer) {
    this.state.update((state) => ({
      turn: state.turn + 1,
      lastPlayerId: player.id,
    }))
  }
}

export default createServer({
  providers: [
    provideServerModules([/* your server modules */]),
    provideServerRooms([BattleRoom]),
  ],
})
```

The path placeholders are supplied by the server during a transfer. Parameter
values cannot contain `/`, `?`, or `#`. Duplicate kinds and duplicate paths fail
during bootstrap instead of routing players unpredictably.

`RpgGameplayRoom` provides:

- `players`, containing synchronized `RpgPlayer` instances;
- `state`, a server-authoritative writable signal;
- `id`, `params`, and `descriptor`, identifying the resolved room instance;
- decorated actions through `@RpgRoomAction()`;
- `broadcast()`, `on()`, and `off()` for ephemeral messages;
- the standard RPGJS database, save, GUI, and player snapshot behavior.

The base class intentionally does not load `RpgEvent` instances. Represent
non-spatial entities in the room's serializable state, or synchronize a
feature-owned model when a game mode needs more than players.

For a reusable module, export the room class or a `rooms` array from a dedicated
`/server` entry point. The application should only install that public result:

```ts
import { provideServerRooms } from "@rpgjs/server"
import { battleRooms } from "@my-game/battle/server"

export default createServer({
  providers: [provideServerRooms(battleRooms)],
})
```

## Register the client scene

Each custom server kind needs one CanvasEngine scene adapter on the client. The
root may be a composed `.ce` component and may use `DOMContainer` for HTML UI.

`battle-scene.ce`:

```html
<Container>
  <Text text={turnLabel} />
</Container>

<script>
  import { computed } from "canvasengine"

  const { room } = defineProps()
  const turnLabel = computed(() => `Turn ${room().state().turn}`)
</script>
```

Register that component from the client entry point:

```ts
import {
  provideClientScenes,
  startGame,
} from "@rpgjs/client"
import BattleScene from "./battle-scene.ce"

type BattleState = {
  turn: number
  lastPlayerId: string | null
}

startGame({
  providers: [
    provideClientScenes<BattleState>([{
      kind: "battle",
      component: BattleScene,
      onEnter(room, descriptor) {
        console.log(`Entered ${descriptor.name}`, room.state())
      },
      onChanges(room) {
        console.log("Battle state changed", room.state())
      },
    }]),
    // Your normal RPGJS client and connection providers.
  ],
})
```

The component receives the synchronized `room` and its server-provided
`descriptor`. When a custom scene is active, RPGJS unmounts the map viewport,
lighting, map entities, prediction, streaming, projectiles, and map physics. GUI
components remain mounted above the custom scene.

Export scenes from a dedicated `/client` entry point when building a reusable
module. The application then installs only `provideClientScenes(battleScenes)`;
it does not need to know the component tree or socket protocol used internally.

`onBeforeEnter` runs while the previous scene is still mounted, `onEnter` runs
after the new room connection opens, `onChanges` receives synchronized packets,
and `onLeave` runs before another room replaces the scene.

Use `onLeave` to remove feature-owned socket listeners and controllers. Use the
CanvasEngine component unmount lifecycle for component-local effects, animation
loops, DOM listeners, and input handlers. RPGJS clears the synchronized room
signals when the scene changes, but it cannot dispose listeners created by the
feature itself.

## Public and private state

`RpgGameplayRoom.state` is synchronized to every connection in the room. Store
only data that every participant and spectator may inspect there. Do not place
hidden hands, enemy skills, private inventory contents, secrets, or authorization
data in the shared state.

Send ephemeral private projections to one player with `player.emit()`. Store
durable player-owned data in synchronized player properties and use
`$syncWithClient: false` for server-only properties. Every client command must be
validated again by a `@RpgRoomAction()` method or another server-side handler;
the custom CanvasEngine scene never owns gameplay authority.

## Transfer players

Only the server selects the destination:

```ts
await player.changeRoom({
  kind: "battle",
  params: { id: "encounter-42" },
})

// Return through the unchanged map API.
await player.changeMap("town", { x: 320, y: 480 })
```

The transfer token preserves the RPGJS player identity and snapshot across the
room boundary. `player.getCurrentRoom()` returns the active lobby, map, or custom
room; `player.getCurrentMap()` is `null` in a map-independent room.

Store the return map and position in server-owned match or player state before
calling `changeRoom()`. Returning to spatial gameplay must use `changeMap()` so
the normal map loading, streaming, movement, and physics lifecycle is restored.

Use the generic hooks when behavior should apply to every room:

```ts
export default {
  player: {
    canChangeRoom(player, destination) {
      return destination.kind !== "battle" || player.level >= 5
    },
    onJoinRoom(player, room) {},
    onLeaveRoom(player, room) {},
  },
  room: {
    onJoin(player, room) {},
    onLeave(player, room) {},
  },
}
```

The existing `canChangeMap`, `onJoinMap`, `onLeaveMap`, and map hooks continue
to run for maps. The generic room hooks run alongside them.

## Failure behavior

RPGJS rejects an unknown room kind, missing or unsafe path parameters, duplicate
server registrations, duplicate client scene kinds, and custom transfers without
a matching client scene. These errors are surfaced through the normal client
connection-error hook.

Register the same room kinds on both runtimes. A server room without a matching
client scene cannot be rendered; a client scene without a matching server room
cannot be selected by an authoritative transfer.
