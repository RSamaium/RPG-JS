---
title: "Use a game with Studio"
description: "Connect an RPGJS game to RPGJS Studio data with provideStudioGame."
---

# Use a game with Studio

Use `provideStudioGame` when the current RPGJS game should load its maps, database, media references, and player start configuration from RPGJS Studio data.

## Install the package

```bash
npm install @rpgjs/studio
```

## Studio mode

In Studio mode, the game reads data from RPGJS Studio. Add `provideStudioGame` to both the client and server configurations and pass the Studio project identifier.

Client configuration:

```ts
// src/config/config.client.ts
import { provideStudioGame } from "@rpgjs/studio/client";

export const configClient = {
  providers: [
    provideStudioGame({
      projectId: "your-project-id",
    }),
  ],
};
```

Server configuration:

```ts
// src/config/config.server.ts
import { provideStudioGame } from "@rpgjs/studio/server";

export const configServer = {
  providers: [
    provideStudioGame({
      projectId: "your-project-id",
    }),
  ],
};
```

When `projectId` is set, the runtime uses online Studio data by default.

## Studio hotbar settings

`createStudioActionBattlePreset()` connects the Action Battle hotbar to the
Studio project and map menu settings:

```ts
import { provideActionBattle } from "@rpgjs/action-battle/server"
import { createStudioActionBattlePreset } from "@rpgjs/studio/server"

provideActionBattle({
  ...createStudioActionBattlePreset(),
})
```

Studio persists the project default under `menus.hotbar`:

```json
{
  "menus": {
    "hotbar": {
      "enabled": true,
      "guiId": null,
      "settings": {
        "content": "mixed",
        "slotCount": 8
      }
    }
  }
}
```

`guiId: null` selects the native RPGJS GUI. Inside `settings`, `content` is
`skills`, `items`, or `mixed`, and `slotCount` is between 1 and 10. A map can
persist the same complete binding to override the project. A map without
`menus.hotbar` inherits the project configuration. The preset opens or closes
the hotbar on map changes, filters its allowed entries, and preserves
temporarily hidden player assignments.

## MMORPG mode

Studio MMORPG maps use an authoritative, chunked data path:

- a trusted publisher loads and normalizes the complete Studio map, project,
  database, events, and collisions;
- the Node server or Cloudflare Durable Object stores that authoritative payload,
  runs physics and events, and decides which chunks surround each player;
- the browser receives only the nearby render descriptors and collision barriers
  required for display and client prediction.

Terrain transition control masks follow the same rule: the publisher splits
them into overlapping regions and the server sends only the regions belonging
to disclosed chunks. The client rebuilds the visible transition masks without
receiving the complete control texture or the complete map.

The complete map is never sent to the browser. Studio events, trigger logic,
database records, project configuration, raw terrain structure, and collisions
outside the streamed area remain server-side. Public image and audio assets are
still downloaded by the browser because it needs them for rendering and playback.

Authoritative streaming requires Studio map format v2. A v1 Studio map continues
to work in standalone mode, but publication to an MMORPG map room fails explicitly
instead of silently exposing or approximating its data.

Configure the disclosure window on the shared Studio module:

```ts
provideStudioGame({
  projectId: "your-project-id",
  streaming: {
    chunkSize: 16,
    loadRadius: 2,
    retainRadius: 3,
  },
});
```

`chunkSize` is expressed in Studio cells. `loadRadius` controls the chunks sent
around the authoritative player position, while `retainRadius` keeps a slightly
larger client cache to avoid loading churn at chunk boundaries. NPCs, events,
players, and projectiles continue to use the generic RPGJS spatial synchronization
path and are disclosed according to server interest management.

Client prediction remains enabled with Studio. Movement is predicted against
the collision barriers already disclosed for the active chunks, blocked at the
edge of the streamed window, then reconciled with authoritative Node or Durable
Object snapshots. Event behavior, NPC decisions, projectile impacts, and every
collision outside that window remain server-authoritative.

### Live map updates from Studio

Players must never publish map definitions. Studio, Vite, CI, an editor backend,
or another trusted process sends the full payload to the map room:

```http
POST /parties/main/map-<mapId>/map/update
Content-Type: application/json
X-RPGJS-Map-Update-Token: <secret>
```

`Authorization: Bearer <secret>` is also accepted. Configure
`RPGJS_MAP_UPDATE_TOKEN` only on the Node server or Worker. Never put it in browser
code or in a `VITE_` environment variable.

Map content and world topology are separate authoritative updates. After
publishing a prepared map, the trusted publisher sends the current topology to
every map room in that world:

```http
POST /parties/main/map-<eachMapId>/world/<worldId>/update
Content-Type: application/json
X-RPGJS-Map-Update-Token: <secret>

{ "id": "<worldId>", "maps": [/* complete runtime topology */] }
```

This fan-out matters because each map is a separate Node room or Durable Object
with its own world manager. Updating only the room for `marsh`, for example,
does not update a player who is still connected to `port`.

The easiest development publisher is the RPGJS Vite plugin:

```ts
import { createStudioMapUpdatePayload } from "@rpgjs/studio/server";

rpgjs({
  server: ServerModule,
  devServer: {
    target: "http://127.0.0.1:8787",
    mapIds: ["your-map-id"],
    mapUpdateToken: process.env.RPGJS_MAP_UPDATE_TOKEN,
    resolveMapPayload: ({ mapId }) =>
      createStudioMapUpdatePayload(mapId, {
        projectId: "your-project-id",
        startMapId: "your-map-id",
      }),
  },
});
```

Vite republishes the resolved map after relevant development changes. The same
callback works with a local Node room provider or a Wrangler Durable Object.
`createStudioMapUpdatePayload()` supplies `worldUpdates`, and the RPGJS remote
publisher automatically sends them to every referenced map room.

To test the HTTP contract directly, send a previously prepared Studio v2 payload:

```bash
curl --fail-with-body \
  -X POST \
  -H 'content-type: application/json' \
  -H 'x-rpgjs-map-update-token: local-map-update-token' \
  --data-binary @prepared-studio-map.json \
  http://127.0.0.1:8787/parties/main/map-<map-id>/map/update
```

The payload must be complete because `/map/update` replaces the authoritative map
revision. Use `createStudioMapUpdatePayload()` rather than assembling production
payloads by hand. Its result includes the normalized v2 render data, dimensions,
server collisions, events, project configuration, and database records needed by
the room. This direct `curl` updates only one map revision; it does not perform
the world fan-out. Use the RPGJS publisher or the Studio seed command for a full
map-and-world publication.

### Trusted publisher data provider

A trusted backend that already owns the Studio project data can inject a
`GameDataProvider` and avoid calling the public Studio API while preparing an
MMORPG map update:

```ts
import {
  createStudioMapUpdatePayload,
  type GameDataProvider,
} from "@rpgjs/studio/server";

const databaseBackedStudioProvider: GameDataProvider = {
  kind: "online",
  getProject: async ({ projectId, mapId }) => loadProject({ projectId, mapId }),
  getMap: async (mapId) => loadMap(mapId),
  getMedia: async (mediaId) => loadMedia(mediaId),
  getDatabase: async (projectId) => loadDatabase(projectId),
};

await createStudioMapUpdatePayload("your-map-id", {
  projectId: "your-project-id",
  startMapId: "your-map-id",
  dataProvider: databaseBackedStudioProvider,
});
```

The injected provider handles every project, map, event-media, and database
read for that payload. It is server-owned in both standalone and MMORPG
deployments: never expose database adapters, private storage handles, or
credentials to browser code. When `dataProvider` is omitted, the existing
online, offline, and auto runtime modes keep selecting the built-in provider.

For a runnable local Worker, deterministic fixture, seed script, and real Studio
API seed command, see the
[Studio playground](https://github.com/RSamaium/RPG-JS/tree/master/playground/games/studio).

## Offline mode

Offline mode lets the game run from exported Studio data without calling the Studio API. Export the project data from Studio into the game public directory, using the default bundle path:

```text
public/
  game-data/
    project.json
    database.json
    events.json
    maps/
      <map-id>.json
    media/
      media-index.json
```

Then configure `provideStudioGame` without `projectId`, or force `runtimeMode` to `"offline"`:

```ts
provideStudioGame({
  runtimeMode: "offline",
});
```

By default, offline data is loaded from `/game-data`. Use `bundleBasePath` only if the exported folder is served from another path:

```ts
provideStudioGame({
  runtimeMode: "offline",
  bundleBasePath: "/my-game-data",
});
```

Offline database records are normalized before they are registered in RPGJS. Studio skill records are available to RPGJS skills automatically with their `spCost`, `hitRate`, `power`, and `coefficient` fields, and enemies can learn skills referenced by their `skills` array.

The project can define hero skill progression with `skills` or `skillsToLearn`. At runtime, `provideStudioGame()` creates a default RPGJS class containing those entries, then RPGJS learns each skill when the configured level is reached:

```json
{
  "skills": [
    { "level": 1, "skillId": "slash-id" },
    { "level": 5, "skillId": "fire-id" }
  ]
}
```

Studio listens to the RPGJS `player.onSkillChange` hook and displays a notification when the hero learns or forgets a skill.

Enemy records can also drive action-battle AI. Use `behavior` on the enemy to set fields such as `enemyType`, `behaviorKey`, `visionRange`, `attackRange`, `attackCooldown`, `dodgeChance`, `dodgeCooldown`, `fleeThreshold`, `attackPatterns`, `patrolWaypoints`, `groupBehavior`, or the nested behavior gauge options. The older `aiBehavior` field is still accepted as a compatibility alias. If the enemy has `attackSkillId`, that skill is used for attacks; otherwise the first learned enemy skill is used.

### Skill workflow triggers

Studio skills may declare `workflowTriggers` that reference Studio block
collections:

```json
{
  "workflowTriggers": [
    { "phase": "cast", "blockCollectionId": "cast-workflow" },
    { "phase": "impact", "blockCollectionId": "impact-workflow" },
    { "phase": "defeat", "blockCollectionId": "defeat-workflow" }
  ]
}
```

This is a Studio orchestration feature built on RPGJS's native skill `onUse`
hook. It does not add a second engine hook. Studio preserves the default skill
effect, waits for projectile impact when applicable, then executes the blocks
from the referenced collection. The block context exposes the caster as the
player and the affected map event as the current event when one exists. A skill
workflow can call or spawn Common Events through the corresponding blocks.

### Item workflow triggers

Studio item records expose fields and workflow phases according to their item
type:

- regular items expose `hpValue`, `mpValue`, `hitRate`, `consumable`,
  `onAdd`, `onUse`, `onUseFailed`, and `onRemove`;
- weapons and armors expose their equipment statistics, parameter modifiers,
  `onAdd`, `onRemove`, and `onEquip`;
- weapons and armors do not expose `consumable`, `onUse`, or `onUseFailed`.

`hitRate` is edited as a percentage from 0 to 100 and normalized to the
native RPGJS `hitRate` value from 0 to 1. An equipment `onEquip` workflow can
test `variables.equip`: it is `true` after equipping and `false` after
unequipping.

```json
{
  "itemType": "weapon",
  "atk": 12,
  "workflowTriggers": [
    { "phase": "onAdd", "blockCollectionId": "sword-found" },
    { "phase": "onEquip", "blockCollectionId": "sword-equipped" }
  ]
}
```

The runtime maps these workflows to the native item hooks. Workflow blocks run
in order for each player, can call Common Events, and keep the normal RPGJS item
or equipment behavior.

The same Studio enemy definition can be placed on a map more than once. The
runtime keeps the first placement's legacy id and assigns deterministic ids
such as `enemy-id::2` to later placements, while preserving `sourceEventId` for
database lookups. Each placement therefore gets its own sprite, hitbox, HP,
Battle AI state, and defeat lifecycle.

## Built-in GUI settings

Studio projects can bind the native Title Screen, Hotbar, HUD, and Main Menu
roles. A `null` `guiId` selects the built-in RPGJS component and leaves room
for a future Studio GUI definition:

```json
{
  "menus": {
    "titleScreen": { "enabled": true, "guiId": null },
    "hotbar": {
      "enabled": true,
      "guiId": null,
      "settings": { "content": "mixed", "slotCount": 8 }
    },
    "hud": { "enabled": true, "guiId": null },
    "mainMenu": { "enabled": true, "guiId": null }
  },
  "keyboardControls": {
    "back": "escape"
  }
}
```

The client applies Title Screen and HUD visibility. The server starts directly
when the project disables the Title Screen, controls Main Menu availability,
and remains authoritative for Hotbar state. The configured Back key and the
mobile Back touch button produce the same logical action.

Map settings do not override the Hotbar. Studio workflows and events use the
`set_hotbar` block to display it with `skills`, `items`, or `mixed` content and
1 to 10 slots, or to hide it without clearing persistent assignments.

## Auto mode

Use `"auto"` when the game should try the exported bundle first, then fall back to Studio if local data is missing:

```ts
provideStudioGame({
  projectId: "your-project-id",
  runtimeMode: "auto",
});
```

## Start without a title screen

Use `autoStart` when the player should enter the starting map as soon as the
server connection is established:

```ts
provideStudioGame({
  projectId: "your-project-id",
  startMapId: "requested-map",
  displayTitleScreen: false,
  autoStart: true,
});
```

The server initializes the built-in default player stats, then transfers the
player to `startMapId` or to the starting map defined by the Studio project.
`autoStart` defaults to `false`, so games using the title-screen `start`
interaction keep their existing behavior. `displayTitleScreen` controls only
the client display and does not enable immediate startup by itself.

## Options

- `projectId`: Studio project identifier. When provided, the default runtime mode is `"online"`.
- `runtimeMode`: data loading strategy. Use `"online"`, `"offline"`, or `"auto"`.
- `bundleBasePath`: public path for exported Studio data. Defaults to `/game-data`.
- `displayTitleScreen`: display the Studio title screen when supported by the project.
- `autoStart`: initialize the player and enter the starting map immediately on
connection. Defaults to `false`.

Studio projects can instead persist `menus.titleScreen.enabled: false`; the
Studio runtime then enables immediate startup automatically. Explicit
`autoStart` remains useful for non-Studio configuration and overrides.
- `startMapId`: force the map used to start the player.
- `streaming`: authoritative Studio v2 chunk settings for MMORPG mode. Set it to
  `false` only when another server map provider replaces the built-in streaming
  adapter. Standalone mode always uses the direct loader. Its options are
  `chunkSize`, `loadRadius`, and `retainRadius`.
- `debugCollisions`: display Studio collision debug overlays. This is a shortcut for the built-in Studio debug plugin.
- `studioPlugins`: attach Studio client-side map renderer plugins. See [Create a Studio plugin](/studio/plugins).
