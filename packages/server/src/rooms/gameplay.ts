import { dispatchPlayerDisconnected } from "./connection-lifecycle";
import { UnhandledAction } from "@signe/room";
import { signal } from "@signe/reactive";
import { sync, users } from "@signe/sync";
import { lastValueFrom } from "rxjs";
import type { RpgRoomDescriptor, RpgWritableSignal } from "@rpgjs/common";
import { context } from "../core/context";
import { RpgPlayer } from "../Player/Player";
import { BaseRoom } from "./BaseRoom";
import type { RpgRoomConnection } from "./map";
import { getRpgRoomMetadata, RpgRoomAction } from "./registry";

type ClientRoomListener = (player: RpgPlayer, data: unknown) => void | Promise<void>;

/**
 * Map-independent gameplay room with RPGJS players and synchronized state.
 *
 * The server owns `state`; clients receive it through `RpgClientRoom`. This
 * class deliberately excludes maps, events, movement, collisions, physics,
 * projectiles, and map loading. It works in standalone and MMORPG modes.
 *
 * @example
 * ```ts
 * @RpgRoom({
 *   kind: "battle",
 *   path: "battle-{id}",
 *   initialState: () => ({ turn: 1 }),
 * })
 * class BattleRoom extends RpgGameplayRoom<{ turn: number }> {
 *   @RpgRoomAction("battle.nextTurn")
 *   nextTurn() {
 *     this.state.update((state) => ({ turn: state.turn + 1 }))
 *   }
 * }
 * ```
 */
export class RpgGameplayRoom<TState = Record<string, unknown>> extends BaseRoom {
  /** Low-level room id resolved from the registered path. */
  readonly id: string;

  /** Path parameters extracted by the room runtime. */
  readonly params: Readonly<Record<string, string>>;

  /** Serializable identity shared with the client scene. */
  readonly descriptor: RpgRoomDescriptor;

  /** Players connected to this room, synchronized by the room runtime. */
  @users(RpgPlayer)
  players = signal<Record<string, RpgPlayer>>({}) as unknown as RpgWritableSignal<Record<string, RpgPlayer>>;

  /** Server-authoritative state synchronized with every connected client. */
  @sync()
  state = signal<TState>(undefined as TState) as unknown as RpgWritableSignal<TState>;

  /** Whether Signe should automatically publish synchronized state changes. */
  autoSync = true;

  private readonly clientListeners = new Map<string, Set<ClientRoomListener>>();

  constructor(room: { id?: string; env?: Record<string, unknown> }, params: Record<string, string> = {}) {
    super();
    const metadata = getRpgRoomMetadata(this.constructor as new (room: unknown) => unknown);
    this.id = room?.id ?? metadata?.path ?? "";
    this.params = Object.freeze({ ...params });
    this.descriptor = Object.freeze({
      id: this.id,
      kind: metadata?.kind ?? "unknown",
      name: params.id ?? this.id,
    });
    if (metadata?.initialState) {
      this.state.set(metadata.initialState() as TState);
    }
    if (room?.env?.TEST === "true") {
      this.autoSync = false;
    }
  }

  async onSessionRestore(payload: { userSnapshot: unknown; user?: RpgPlayer }): Promise<unknown> {
    const restored = await BaseRoom.prototype.onSessionRestore.call(
      this,
      payload as { userSnapshot: any; user?: RpgPlayer },
    );
    if (
      payload.user
      && restored
      && typeof restored === "object"
      && !Array.isArray(restored)
      && "variables" in restored
      && restored.variables
      && typeof restored.variables === "object"
      && !Array.isArray(restored.variables)
    ) {
      // `variables` is a typed persistent signal rather than a decorator field.
      // Hydrate it explicitly before Signe loads the remaining snapshot.
      payload.user.variables.set({ ...(restored.variables as Record<string, unknown>) });
      const remaining = { ...(restored as Record<string, unknown>) };
      delete remaining.variables;
      return remaining;
    }
    return restored;
  }

  async onJoin(player: RpgPlayer, conn: RpgRoomConnection): Promise<void> {
    player.room = this;
    player.map = null;
    player.context = context;
    player.conn = conn;
    await lastValueFrom(this.hooks.callHooks("server-room-onJoin", player, this));
    await lastValueFrom(this.hooks.callHooks("server-player-onJoinRoom", player, this));
    this.$applySync?.();
  }

  async onLeave(player: RpgPlayer, conn: RpgRoomConnection | null = player.conn): Promise<void> {
    await lastValueFrom(this.hooks.callHooks("server-room-onLeave", player, this));
    await lastValueFrom(this.hooks.callHooks("server-player-onLeaveRoom", player, this));
    await dispatchPlayerDisconnected(this.hooks, player, conn);
  }

  /** Subscribe to an ephemeral client action not handled by a decorated method. */
  on<T = unknown>(type: string, listener: (player: RpgPlayer, data: T) => void | Promise<void>): void {
    let bucket = this.clientListeners.get(type);
    if (!bucket) {
      bucket = new Set();
      this.clientListeners.set(type, bucket);
    }
    bucket.add(listener as ClientRoomListener);
  }

  /** Remove every room listener registered for an ephemeral client action. */
  off(type: string): void {
    this.clientListeners.delete(type);
  }

  /** Broadcast an ephemeral packet to every client connected to this room. */
  broadcast<T = unknown>(type: string, value?: T): void {
    this.$broadcast({ type, value });
  }

  @RpgRoomAction("gui.interaction")
  async guiInteraction(player: RpgPlayer, value: { guiId: string; name: string; data: unknown }): Promise<void> {
    const gui = player.getGui(value.guiId);
    if (gui) await gui.emit(value.name, value.data);
  }

  @RpgRoomAction("gui.exit")
  guiExit(player: RpgPlayer, value: { guiId: string; data?: unknown; guiOpenId?: unknown }): void {
    player.removeGui(value.guiId, value.data, value.guiOpenId);
  }

  @UnhandledAction()
  async onUnhandledAction(player: RpgPlayer, message: { action: string; value: unknown }): Promise<void> {
    await player._dispatchClientEvent(message.action, message.value);
    for (const listener of this.clientListeners.get(message.action) ?? []) {
      await listener(player, message.value);
    }
  }
}

export interface RpgGameplayRoom<TState = Record<string, unknown>> {
  $applySync(): void;
  $broadcast(packet: unknown, without?: string[]): void;
  $send(connection: RpgRoomConnection, packet: unknown): void;
  $sessionTransfer(connection: RpgRoomConnection, roomId: string): Promise<unknown>;
}
