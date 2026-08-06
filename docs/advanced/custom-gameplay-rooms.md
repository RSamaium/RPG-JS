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

## Register the client scene

Each custom server kind needs one CanvasEngine scene adapter on the client:

```ts
import { Container, h } from "canvasengine"
import {
  provideClientScenes,
  startGame,
  type RpgClientRoomSceneProps,
} from "@rpgjs/client"

type BattleState = {
  turn: number
  lastPlayerId: string | null
}

function BattleScene({ room }: RpgClientRoomSceneProps<BattleState>) {
  console.log("Current turn", room.state().turn)
  console.log("Players", room.players())
  return h(Container)
}

startGame({
  providers: [
    provideClientScenes([{
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

`onBeforeEnter` runs while the previous scene is still mounted, `onEnter` runs
after the new room connection opens, `onChanges` receives synchronized packets,
and `onLeave` runs before another room replaces the scene.

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
