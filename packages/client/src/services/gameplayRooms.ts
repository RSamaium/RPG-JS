import type { ComponentFunction } from "canvasengine";
import { signal } from "canvasengine";
import { load, users } from "@signe/sync";
import type {
  RpgProvider,
  RpgProviders,
  RpgRoomDescriptor,
  RpgWritableSignal,
} from "@rpgjs/common";
import { RpgClientPlayer } from "../Game/Player";

const CLIENT_SCENES_PROVIDER_META = "rpgjs:client-scenes";

class RpgClientRoomPlayers {
  @users(RpgClientPlayer)
  players = signal<Record<string, RpgClientPlayer>>({});
}

/** Client representation of a synchronized non-map gameplay room. */
export class RpgClientRoom<TState = Record<string, unknown>> {
  private readonly synchronizedPlayers = new RpgClientRoomPlayers();

  /** Descriptor supplied by the authoritative server transfer. */
  descriptor = signal<RpgRoomDescriptor | null>(null);

  /** RPGJS players synchronized in this room. */
  players = this.synchronizedPlayers.players as unknown as RpgWritableSignal<Record<string, RpgClientPlayer>>;

  /** Server-authoritative custom room state. */
  state = signal<TState>(undefined as TState) as unknown as RpgWritableSignal<TState>;

  /** @internal Apply a synchronized player collection without touching room state. */
  loadPlayers(players: unknown): void {
    load(this.synchronizedPlayers, { players }, true);
  }

  reset(descriptor: RpgRoomDescriptor | null = null): void {
    this.players.set({});
    this.state.set(undefined as TState);
    this.descriptor.set(descriptor);
  }
}

/** Props passed to a custom gameplay-room CanvasEngine component. */
export interface RpgClientRoomSceneProps<TState = unknown> {
  room: RpgClientRoom<TState>;
  descriptor: RpgRoomDescriptor;
}

/** Lifecycle and CanvasEngine renderer for one registered server room kind. */
export interface RpgClientSceneDefinition<TState = unknown> {
  /** Server room kind handled by this scene. */
  kind: string;
  /** Root CanvasEngine component mounted directly below the RPGJS Canvas. */
  component: ComponentFunction<RpgClientRoomSceneProps<TState>>;
  /** Called while the previous scene is still mounted, before entering this room. */
  onBeforeEnter?: (room: RpgClientRoom<TState>, descriptor: RpgRoomDescriptor) => void | Promise<void>;
  /** Called after the target connection has opened. */
  onEnter?: (room: RpgClientRoom<TState>, descriptor: RpgRoomDescriptor) => void | Promise<void>;
  /** Called before this scene is replaced by another room. */
  onLeave?: (room: RpgClientRoom<TState>, next: RpgRoomDescriptor) => void | Promise<void>;
  /** Called whenever synchronized room state changes. */
  onChanges?: (room: RpgClientRoom<TState>, partial: unknown) => void | Promise<void>;
}

/**
 * Register CanvasEngine scene adapters for custom gameplay-room kinds.
 *
 * The client owns rendering and input while synchronized room data remains
 * server-authoritative. The provider works in standalone and MMORPG clients.
 *
 * @param scenes - Scene definitions keyed by the server-registered room kind.
 * @returns An RPGJS provider installed in the client configuration.
 *
 * @example
 * ```ts
 * provideClientScenes<BattleState>([{
 *   kind: "battle",
 *   component: BattleScene,
 * }])
 * ```
 */
export function provideClientScenes<TState = unknown>(scenes: RpgClientSceneDefinition<TState>[]): RpgProvider {
  const token = class RpgClientScenesProvider {};
  return {
    provide: token,
    useValue: [...scenes],
    meta: { kind: CLIENT_SCENES_PROVIDER_META },
  };
}

/** @internal */
export function collectProvidedClientScenes(providers: RpgProviders): RpgClientSceneDefinition<any>[] {
  const scenes: RpgClientSceneDefinition<any>[] = [];
  const visit = (entries: RpgProviders): void => {
    for (const entry of entries) {
      if (Array.isArray(entry)) {
        visit(entry);
        continue;
      }
      if (
        typeof entry === "object"
        && entry !== null
        && entry.meta?.kind === CLIENT_SCENES_PROVIDER_META
        && "useValue" in entry
        && Array.isArray(entry.useValue)
      ) {
        scenes.push(...entry.useValue as RpgClientSceneDefinition<any>[]);
      }
    }
  };
  visit(providers);
  return scenes;
}

/** @internal */
export class RpgClientSceneRegistry {
  private readonly definitions = new Map<string, RpgClientSceneDefinition<any>>();

  constructor(definitions: RpgClientSceneDefinition<any>[]) {
    for (const definition of definitions) {
      if (!definition.kind.trim()) throw new Error("Client scene kind cannot be empty");
      if (definition.kind === "map" || definition.kind === "lobby") {
        throw new Error(`Client scene kind ${definition.kind} is reserved by RPGJS`);
      }
      if (this.definitions.has(definition.kind)) {
        throw new Error(`Duplicate RPGJS client scene kind: ${definition.kind}`);
      }
      this.definitions.set(definition.kind, definition);
    }
  }

  get(kind: string): RpgClientSceneDefinition<any> | undefined {
    return this.definitions.get(kind);
  }
}
