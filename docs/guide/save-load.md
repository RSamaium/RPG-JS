---
title: "Save and load player data"
description: "Persist RPGJS save slots in standalone games and authenticated MMORPGs."
---

# Save/Load Strategy (Client-Driven)

This guide explains how to use the client-driven save/load flow introduced for RPGJS.
The client requests the slot list and triggers save/load actions, while the server
executes `player.save(slot)` and `player.load(slot)` using a pluggable storage strategy.

## Concepts

- **Save storage strategy (server)**: decides where snapshots are stored (DB, file, memory).
- **Auto-save strategy (server)**: decides when saving/loading is allowed and the auto slot.
- **Save client service (client)**: requests slot list and triggers save/load actions.
- **Slots metadata**: what the UI displays (level, exp, map, date, custom fields).

## Standalone and MMORPG storage

The same save API works in both modes, but the correct storage is different:

| Runtime                          | Suitable storage                           |
| -------------------------------- | ------------------------------------------ |
| Standalone RPG in the browser    | `LocalStorageSaveStorageStrategy`          |
| Local test or short-lived server | Default memory-only strategy               |
| Production MMORPG                | A server-side database or trusted HTTP API |

MMORPG room storage is not save-slot storage. Room storage keeps synchronized
room state and session mappings. A `SaveStorageStrategy` keeps long-term
character snapshots and must be available to every server instance that can
receive the player.

In an authenticated MMORPG, use the stable `player.id` returned by
[`auth()`](/advanced/auth) as the account key. Never accept the account id from a
save request sent by the browser.

## Server: provide a storage strategy

The server exposes `save.list`, `save.save`, and `save.load` actions. A storage
strategy is injected via DI; if none is provided, a memory-only strategy is used.
The server can also control whether saving/loading is allowed.

### Strategy contract

```ts
interface SaveStorageStrategy {
  list(player): Promise<Array<SaveSlotMeta | null>>;
  get(player, index): Promise<SaveSlot | null>;
  save(player, index, snapshot, meta): Promise<void>;
  delete?(player, index): Promise<void>;
  // storage only, no auto-save policy here
}
```

## Server: provide an auto-save strategy

```ts
interface AutoSaveStrategy {
  canSave?(player, context): boolean;
  canLoad?(player, context): boolean;
  shouldAutoSave?(player, context): boolean;
  getDefaultSlot?(player, context): number | null;
}
```

The `getDefaultSlot()` function is the **auto slot**. When you call
`player.save("auto")`, this strategy decides which slot is used (e.g. always slot 0,
or last used slot).

### Register auto-save strategy

Auto-save is disabled by default. During `player.syncChanges()`, RPGJS calls
`shouldAutoSave()` and saves to the default slot only when it returns `true`.
Do not return `true` on every synchronization: network storage could otherwise
receive many overlapping writes.

This example limits automatic saves to one attempt per player per minute:

```ts
import { createServer, provideAutoSave } from "@rpgjs/server";

const lastSaveAt = new Map<string, number>();

const server = createServer({
  providers: [
    provideAutoSave({
      canSave: (player) => player.hp > 0,
      getDefaultSlot: () => 0,
      shouldAutoSave(player) {
        const now = Date.now();
        const previous = lastSaveAt.get(player.id) ?? 0;
        if (now - previous < 60_000) return false;
        lastSaveAt.set(player.id, now);
        return true;
      },
    }),
  ],
});
```

For checkpoints, quest completion, or logout logic, you can instead call
`await player.save("auto")` explicitly from the corresponding server hook. The
auto-save policy selects the slot and can still allow or deny that operation;
the storage strategy only decides where the snapshot is written.

### Save points (server authority)

If you want to restrict saving to specific points, you can deny saves by default
and only allow them when the player interacts with a save point.

```ts
import { provideAutoSave } from "@rpgjs/server";

let saveEnabled = false;

const autoSave = {
  canSave: () => saveEnabled,
  getDefaultSlot: () => 0,
};

// Somewhere in your event logic:
// saveEnabled = true; player.showSave(); saveEnabled = false;
```

### Register the strategy

```ts
import { createServer, provideSaveStorage } from "@rpgjs/server";

const server = createServer({
  providers: [provideSaveStorage(new MyStorageStrategy())],
});
```

The server will build slot metadata automatically (level, exp, map, date), and you
can extend it by passing custom fields from the client.

### Example: store MMORPG saves through an HTTP API

The following example shows the complete adapter shape for a trusted remote API,
such as an API hosted by your own backend or by Studio in the future. The
`/saves/list`, `/saves/get`, `/saves/upsert`, and `/saves/delete` routes are
illustrative: they are **not existing RPGJS Studio endpoints**. Replace them with
the real contract of your service.

```ts
import type { RpgPlayer, SaveStorageStrategy } from "@rpgjs/server";
import type { SaveSlot, SaveSlotList, SaveSlotMeta } from "@rpgjs/common";

type StudioSaveOptions = {
  baseUrl: string;
  projectId: string;
  apiKey: string;
};

export class StudioHttpSaveStorage implements SaveStorageStrategy {
  constructor(private readonly options: StudioSaveOptions) {}

  async list(player: RpgPlayer): Promise<SaveSlotList> {
    const result = await this.post<{ slots: SaveSlotList }>("/saves/list", {
      projectId: this.options.projectId,
      playerId: this.playerId(player),
    });
    return result.slots;
  }

  async get(player: RpgPlayer, index: number): Promise<SaveSlot | null> {
    const result = await this.post<{ slot: SaveSlot | null }>("/saves/get", {
      projectId: this.options.projectId,
      playerId: this.playerId(player),
      index: this.slotIndex(index),
    });
    return result.slot;
  }

  async save(
    player: RpgPlayer,
    index: number,
    snapshot: string,
    meta: SaveSlotMeta
  ): Promise<void> {
    // Server-owned fields overwrite any metadata received from the browser.
    const trustedMeta: SaveSlotMeta = {
      ...meta,
      level: player.level,
      exp: player.exp,
      map: player.getCurrentMap()?.id,
      date: new Date().toISOString(),
    };

    await this.post("/saves/upsert", {
      projectId: this.options.projectId,
      playerId: this.playerId(player),
      index: this.slotIndex(index),
      snapshot,
      meta: trustedMeta,
    });
  }

  async delete(player: RpgPlayer, index: number): Promise<void> {
    await this.post("/saves/delete", {
      projectId: this.options.projectId,
      playerId: this.playerId(player),
      index: this.slotIndex(index),
    });
  }

  private playerId(player: RpgPlayer): string {
    if (!player.id) throw new Error("Authenticated player id is required");
    return player.id;
  }

  private slotIndex(index: number): number {
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new Error("Save slot must be a non-negative integer");
    }
    return index;
  }

  private async post<T = void>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Save API failed with HTTP ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
```

Register the adapter only in the server configuration. Read the URL, project id,
and API key from server environment variables; never use a `VITE_` variable for
the API key because those variables can be included in browser code.

```ts
provideSaveStorage(
  new StudioHttpSaveStorage({
    baseUrl: process.env.SAVE_API_URL!,
    projectId: process.env.RPGSTUDIO_PROJECT_ID!,
    apiKey: process.env.RPGSTUDIO_API_KEY!,
  })
);
```

The remote API should uniquely identify a slot by `projectId + playerId + index`.
`list` returns metadata without snapshots, while `get` returns one object shaped
like `{ snapshot, ...meta }`. The example expects `save` and `delete` to return
`204 No Content`; `save` should perform an atomic insert-or-update. For
production, also impose a maximum snapshot size and prevent an older concurrent
request from replacing a newer save.

<Warning>
Metadata received from a gameplay client is untrusted. Do not use client-provided
`map`, `level`, `date`, account ids, or authorization fields to make server-side
decisions. Validate or rebuild meaningful metadata in trusted server code or in
the save API.
</Warning>

### Built-in localStorage strategy (standalone)

For standalone mode (server running in the browser), use the built-in localStorage
strategy. It stores full slots (meta + snapshot) under a single key and can carry
an optional policy.

```ts
import {
  createServer,
  provideSaveStorage,
  LocalStorageSaveStorageStrategy,
} from "@rpgjs/server";

const server = createServer({
  providers: [
    provideSaveStorage(new LocalStorageSaveStorageStrategy({ key: "save" })),
  ],
});
```

## Client: request slots and trigger save/load

The client uses `SaveClientService` to talk to the server. It is already included
in `provideRpg()` and `provideMmorpg()`.

### Typical flow

1. Call `saveClient.listSlots()` to get the current slot list.
2. Show the Save/Load UI with those slots.
3. On interaction:
   - `saveClient.saveSlot(index)` for save.
   - `saveClient.loadSlot(index)` for load.

These calls do not send a player/account id. The server obtains the authenticated
`player` from the WebSocket action and passes it to the storage strategy.

## When an MMORPG save is loaded

RPGJS does not choose a slot automatically. Your game must choose one of these
flows after authentication:

- list the slots and let the player select a character;
- load a known slot, such as slot `0`;
- remember the last selected slot in your account service;
- initialize a new character when no slot exists.

For example, a game with one character per account can load slot `0` from the
server-side `onConnected` hook:

```ts
import type { RpgPlayerHooks } from "@rpgjs/server";

const player: RpgPlayerHooks = {
  async onConnected(player) {
    const result = await player.load(
      0,
      { reason: "load", source: "login" },
      { changeMap: true }
    );

    if (!result.ok) {
      player.initializeDefaultStats();
      // Continue with your new-character or title-screen flow.
    }
  },
};
```

When loading succeeds, RPGJS applies the snapshot and, by default, moves the
player to the map stored in the slot metadata. Do not repeat this load in
`onJoinMap`: a map change already transfers the live player state between rooms.

### Refresh, room transfer, and returning later

- **Map change:** RPGJS transfers the current session and player state. No save
  API read is required.
- **Browser refresh:** RPGJS can reconnect the private session and room state.
  This is not a call to `player.load()`.
- **New session or later visit:** `auth()` recovers the stable account id, then
  your login/title-screen flow must explicitly select and load a slot.

## Player API (server-side)

- `player.snapshot()` -> returns the raw snapshot object (low-level).
- `player.save()` -> returns a JSON snapshot string for v4 compatibility.
- `player.save(slot)` -> stores a snapshot using the storage strategy.
  - Use `"auto"` to ask the policy `getDefaultSlot()` which slot to use.
- `player.load(snapshot)` -> loads a JSON string or object snapshot for v4 compatibility.
- `player.load(slot)` -> loads a slot using the storage strategy.

Use `player.snapshot()` if you need to serialize or inspect state without saving.

`RpgPlayerHooks.onLoad(player, snapshot)` runs after any snapshot is applied.
`RpgPlayerHooks.onSave(player, snapshot)` runs before a slot snapshot is handed to
the storage strategy. Both hooks receive the exported `RpgPlayerSnapshot` type.

Examples:

```ts
const snapshot = await player.save(); // JSON snapshot string
await player.load(snapshot); // restore from snapshot

await player.save("auto"); // auto slot (policy)
await player.save(2); // fixed slot
await player.load(2); // fixed slot
```

## GUI options (auto slot + save disabled)

The save/load GUI can display a dedicated "Auto Save" slot at the top. It is
read-only in save mode, and selectable in load mode.

### Menu GUI (server-side)

`MenuGui.open()` accepts these options:

- `saveShowAutoSlot` (boolean) -> show the auto slot in the GUI
- `saveAutoSlotIndex` (number) -> which slot index to use for auto save
- `saveAutoSlotLabel` (string) -> label displayed for auto slot

`canSave` is computed from the AutoSaveStrategy and sent to the client; if false,
the "Save" entry is disabled in the menu.

### Save/Load component (client-side)

Props supported by the component:

- `showAutoSlot` (boolean)
- `autoSlotIndex` (number)
- `autoSlotLabel` (string)

When `showAutoSlot` is enabled:

- **save mode**: auto slot is displayed but read-only
- **load mode**: auto slot behaves like a normal slot and loads as usual

### Example (menu or title screen)

```ts
import { inject } from "@rpgjs/client";
import { RpgGui, SaveClientService } from "@rpgjs/client";

const gui = inject(RpgGui);
const saveClient = inject(SaveClientService);

async function openSaveMenu() {
  const slots = await saveClient.listSlots();
  gui.display("rpg-save", {
    mode: "save",
    slots,
    onInteraction: async (action, { index }) => {
      if (action === "save") await saveClient.saveSlot(index);
      if (action === "load") await saveClient.loadSlot(index);
    },
  });
}
```

## Events sent by the server

These are emitted to the client and handled by `SaveClientService`:

- `save.list.result` -> `{ requestId, slots }`
- `save.save.result` -> `{ requestId, index, slots }`
- `save.load.result` -> `{ requestId, index, ok, slot }`
- `save.error` -> `{ requestId, message }`

## Notes

- Works in standalone and client/server modes.
- Slot metadata is a free object, so you can display any custom fields.
- The Save/Load GUI displays interactions. `SaveClientService` requests the
  slots, while the server storage strategy persists them.
- Auto-save is disabled by default. Providing storage does not enable it.
