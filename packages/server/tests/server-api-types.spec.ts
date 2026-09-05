import { describe, expectTypeOf, test } from "vitest";
import type { HotbarState, MapStreamDefinition, RpgActionInput, RpgRoomDescriptor } from "@rpgjs/common";
import type { FactoryProvider as SigneFactoryProvider } from "@signe/di";
import type { NodeConnection, NodeRoom } from "@signe/room/node";
import { provideServerMapStreaming, provideServerRooms, RpgGameplayRoom } from "@rpgjs/server";
import type {
  RpgEvent,
  RpgEventHooks,
  RpgMap,
  RpgMapHooks,
  RpgPlayer,
  RpgPlayerHooks,
  RpgPlayerConnectionContext,
  RpgPlayerSaveResult,
  RpgPlayerSlotLoadResult,
  RpgPlayerSnapshot,
  RpgPlayerSnapshotLoadResult,
  RpgServerEngine,
  RpgServerEngineHooks,
  RpgServerStepMetrics,
  StateData,
  ActorData,
  ServerMapStreamingAdapter,
} from "@rpgjs/server";
import {
  createMemoryNodeRoomStorage,
  createSqliteNodeRoomStorage,
  type RpgHostedRoom,
  type RpgHostedRoomConnection,
  type RpgMemoryRoomStorageProvider,
  type RpgRoomStorageProvider,
} from "@rpgjs/server/node";
import type { RpgProvider, RpgWritableSignal } from "@rpgjs/common";

describe("server public API types", () => {
  test("gameplay room subclasses are accepted by the room provider", () => {
    class BattleRoom extends RpgGameplayRoom<{ turn: number }> {}
    expectTypeOf(provideServerRooms([BattleRoom])).toMatchTypeOf<RpgProvider[]>();
  });

  test("player hooks match the runtime contracts", () => {
    const hooks = {
      async onLoad(player, snapshot) {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(snapshot).toEqualTypeOf<RpgPlayerSnapshot>();
      },
      onSave(player, snapshot) {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(snapshot).toEqualTypeOf<RpgPlayerSnapshot>();
      },
      onInput(player, input) {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(input).toEqualTypeOf<RpgActionInput<unknown>>();
      },
      onAccepted(player, context) {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(context).toEqualTypeOf<RpgPlayerConnectionContext>();
        expectTypeOf(context.query).toEqualTypeOf<Readonly<Record<string, string>>>();
      },
      onHotbarChange(player, change) {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(change.state).toEqualTypeOf<HotbarState>();
        expectTypeOf(change.action).toEqualTypeOf<"initialize" | "assign" | "clear">();
      },
      canChangeMap(player, nextMap) {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(nextMap).toEqualTypeOf<{ id: string }>();
        return nextMap.id !== "forbidden";
      },
      canChangeRoom(player, room) {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(room).toEqualTypeOf<RpgRoomDescriptor>();
        return room.kind !== "forbidden";
      },
    } satisfies RpgPlayerHooks;

    expectTypeOf(hooks).toMatchTypeOf<RpgPlayerHooks>();
  });

  test("save and load overloads expose discriminated results", () => {
    const assertions = (player: RpgPlayer) => {
      expectTypeOf(player.snapshot()).toEqualTypeOf<RpgPlayerSnapshot>();
      expectTypeOf(player.applySnapshot({ name: "Hero" })).toEqualTypeOf<Promise<RpgPlayerSnapshot>>();
      expectTypeOf(player.save()).toEqualTypeOf<Promise<string>>();
      expectTypeOf(player.save(0)).toEqualTypeOf<Promise<RpgPlayerSaveResult | null>>();
      expectTypeOf(player.load(0)).toEqualTypeOf<Promise<RpgPlayerSlotLoadResult>>();
      expectTypeOf(player.load({ name: "Hero" })).toEqualTypeOf<Promise<RpgPlayerSnapshotLoadResult>>();
      expectTypeOf(player.getVariable("quest")).toEqualTypeOf<unknown>();
      expectTypeOf(player.getVariable<number>("quest")).toEqualTypeOf<number | undefined>();
      expectTypeOf(player.on<{ text: string }>("chat", payload => { void payload.text })).toEqualTypeOf<void>();
      expectTypeOf(player.getState("poison")).toEqualTypeOf<StateData | undefined>();
      expectTypeOf(player.getHotbar()).toEqualTypeOf<HotbarState>();
      expectTypeOf(player.assignHotbarSlot(0, { type: "skill", id: "fire" }))
        .toEqualTypeOf<HotbarState>();
      expectTypeOf(player.clearHotbarSlot(0)).toEqualTypeOf<HotbarState>();
      expectTypeOf(player.changeRoom({ kind: "battle", params: { id: "one" } }))
        .toEqualTypeOf<Promise<boolean>>();
      expectTypeOf(player.getCurrentRoom<RpgGameplayRoom<{ turn: number }>>())
        .toEqualTypeOf<RpgGameplayRoom<{ turn: number }> | null>();
      expectTypeOf(player.showCharacterSelect([{ id: "hero", name: "Hero" }]))
        .toEqualTypeOf<Promise<ActorData | null>>();
      expectTypeOf(player.setActor({ id: "hero", name: "Hero" }))
        .toEqualTypeOf<ActorData>();
      expectTypeOf(player.changeActor({ id: "mage", name: "Mage", animations: { attack: "magic" }, class: { id: "caster", name: "Caster" } }))
        .toEqualTypeOf<ActorData>();
    };

    expectTypeOf(assertions).toBeFunction();
  });

  test("event and map hooks expose their complete arguments", () => {
    const eventHooks = {
      onAction(event, player, input) {
        expectTypeOf(event).toEqualTypeOf<RpgEvent>();
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        expectTypeOf(input).toEqualTypeOf<RpgActionInput<unknown>>();
      },
      onTouch(event, other, context) {
        expectTypeOf(event).toEqualTypeOf<RpgEvent>();
        expectTypeOf(other).toEqualTypeOf<RpgPlayer | RpgEvent>();
        expectTypeOf(context.map).toEqualTypeOf<RpgMap>();
      },
    } satisfies RpgEventHooks;

    const mapHooks = {
      onLoad(map) {
        expectTypeOf(map).toEqualTypeOf<RpgMap>();
      },
      onBeforeUpdate(data, map) {
        expectTypeOf(data).toEqualTypeOf<unknown>();
        expectTypeOf(map).toEqualTypeOf<RpgMap>();
      },
    } satisfies RpgMapHooks;

    expectTypeOf(eventHooks).toMatchTypeOf<RpgEventHooks>();
    expectTypeOf(mapHooks).toMatchTypeOf<RpgMapHooks>();
  });

  test("unknown hook names remain rejected", () => {
    const hooks: RpgPlayerHooks = {
      // @ts-expect-error typo in a built-in hook
      onLoadd() {},
    };
    expectTypeOf(hooks).toEqualTypeOf<RpgPlayerHooks>();
  });

  test("map streaming adapters keep provider-specific data typed", () => {
    type PrivateMap = { source: string };
    type ManifestData = { theme: string };
    type ChunkData = { tiles: number[] };
    const definition = {} as MapStreamDefinition<ManifestData, ChunkData>;
    const adapter = {
      compile(mapData, map) {
        expectTypeOf(mapData).toEqualTypeOf<PrivateMap>();
        expectTypeOf(map).toEqualTypeOf<RpgMap>();
        return definition;
      },
    } satisfies ServerMapStreamingAdapter<PrivateMap, ManifestData, ChunkData>;

    expectTypeOf(provideServerMapStreaming(adapter)).toMatchTypeOf<object>();
  });

  test("gameplay signals and room storage stay RPGJS-owned", () => {
    const assertions = (player: RpgPlayer, room: RpgHostedRoom) => {
      expectTypeOf(player.hpSignal).toEqualTypeOf<RpgWritableSignal<number>>();
      expectTypeOf(room.storage.get("state")).toEqualTypeOf<Promise<unknown>>();
    };

    expectTypeOf(createMemoryNodeRoomStorage()).toEqualTypeOf<RpgMemoryRoomStorageProvider>();
    expectTypeOf(createSqliteNodeRoomStorage({ databasePath: "rooms.sqlite" }))
      .toEqualTypeOf<RpgRoomStorageProvider>();
    expectTypeOf<NodeRoom>().toMatchTypeOf<RpgHostedRoom>();
    expectTypeOf<NodeConnection>().toMatchTypeOf<RpgHostedRoomConnection>();
    expectTypeOf(assertions).toBeFunction();
  });

  test("SQLite storage requires exactly one database source", () => {
    const assertSqliteSources = () => {
      createSqliteNodeRoomStorage({ databasePath: "rooms.sqlite" });

      // @ts-expect-error SQLite storage requires database or databasePath
      createSqliteNodeRoomStorage({});

      const database = {
        exec() {},
        prepare() {
          return {
            get: () => undefined,
            run: () => ({ changes: 0 }),
            all: () => [],
          };
        },
      };
      createSqliteNodeRoomStorage({ database });

      // @ts-expect-error database and databasePath are mutually exclusive
      createSqliteNodeRoomStorage({ database, databasePath: "rooms.sqlite" });
    };

    expectTypeOf(assertSqliteSources).toBeFunction();
  });

  test("Signe providers remain structurally accepted", () => {
    const provider = {
      provide: "feature",
      useFactory: () => ({ enabled: true }),
    } satisfies RpgProvider;

    expectTypeOf(provider).toMatchTypeOf<RpgProvider>();
    expectTypeOf<SigneFactoryProvider>().toMatchTypeOf<RpgProvider>();
  });

  test("the server engine rejects unknown inherited members", () => {
    const assertions = (server: RpgServerEngine) => {
      expectTypeOf(server.onStart()).toEqualTypeOf<Promise<void>>();
      expectTypeOf(server.getCurrentRoomId()).toEqualTypeOf<string | null>();
      // @ts-expect-error typo in the public server surface
      server.getCurentRoom();
    };

    expectTypeOf(assertions).toBeFunction();
  });

  test("server step hooks expose metrics without breaking one-argument handlers", () => {
    const hooks = {
      onStep(server, metrics) {
        expectTypeOf(server).toEqualTypeOf<RpgServerEngine>();
        expectTypeOf(metrics).toEqualTypeOf<RpgServerStepMetrics>();
      },
    } satisfies RpgServerEngineHooks;
    const legacyHooks = {
      onStep(server) {
        expectTypeOf(server).toEqualTypeOf<RpgServerEngine>();
      },
    } satisfies RpgServerEngineHooks;

    expectTypeOf(hooks).toMatchTypeOf<RpgServerEngineHooks>();
    expectTypeOf(legacyHooks).toMatchTypeOf<RpgServerEngineHooks>();
  });

  test("legacy Signe root re-exports are not part of the stable API", () => {
    // @ts-expect-error reactive factories are no longer exported by @rpgjs/server
    type LegacyServerSignal = typeof import("@rpgjs/server")["signal"];
    expectTypeOf<LegacyServerSignal>();
  });
});
