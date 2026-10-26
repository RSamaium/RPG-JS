import type { MapAuthority, MapAuthorityOptions } from "../../authority/authority";
import { createMapAuthority } from "../../authority/authority";
import { registerElementIntents } from "../../interaction/builtin-intents";
import { createInteraction, type InteractionController } from "../../interaction/controller";
import type { PipelineStep } from "../../interaction/pipeline";
import { registerPlacementIntent, type PlacementIntentOptions } from "../../interaction/placement";
import { assets, describeContext, sceneOf, world } from "../../interaction/__fixtures__";
import type { ClientMessage, MapTransport, ServerMessage } from "../../protocol";
import { catalog } from "../../authority/__fixtures__";
import { connectInMemory } from "../memory-transport";
import { joinRemoteMap, type JoinRemoteMapOptions, type RemoteMap } from "../join";

export { assets, catalog, world };

export const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export interface Wire {
  /** What the client sent, in order. */
  readonly sent: ClientMessage[];
  /** What the authority sent to the client, in order, before any dropping. */
  readonly received: ServerMessage[];
  /** Drops the server messages for which this is true. */
  drop(predicate: (message: ServerMessage) => boolean): void;
  /** Delivers every server message twice. */
  duplicate(on?: boolean): void;
  /** Holds back what the client sends, until `release`. */
  hold(on?: boolean): void;
  release(): void;
  /** Makes the client hear something the authority did not send. */
  emit(message: ServerMessage): void;
}

/** A transport that can lose, repeat and delay messages, around the in-memory one. */
export function instrument(inner: MapTransport): { transport: MapTransport; wire: Wire } {
  const listeners = new Set<(message: ServerMessage) => void>();
  const wire: Wire & { state: { drop?: (m: ServerMessage) => boolean; twice: boolean; holding: boolean; held: ClientMessage[] } } = {
    state: { twice: false, holding: false, held: [] },
    sent: [],
    received: [],
    drop: (predicate) => void (wire.state.drop = predicate),
    duplicate: (on = true) => void (wire.state.twice = on),
    hold: (on = true) => void (wire.state.holding = on),
    release() {
      wire.state.holding = false;
      for (const message of wire.state.held.splice(0)) inner.send(message);
    },
    emit: (message) => listeners.forEach((listener) => listener(message)),
  };
  inner.onMessage((message) => {
    wire.received.push(message);
    if (wire.state.drop?.(message)) return;
    for (let i = 0; i < (wire.state.twice ? 2 : 1); i++) listeners.forEach((listener) => listener(message));
  });
  return {
    wire,
    transport: {
      send(message) {
        wire.sent.push(message);
        if (wire.state.holding) wire.state.held.push(message);
        else inner.send(message);
      },
      onMessage(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
}

export interface ClientOptions extends Partial<Omit<JoinRemoteMapOptions, "transport">> {
  readonly actor?: unknown;
  /** Rules the client previews with: the same steps a game would share with the authority. */
  readonly pipeline?: { readonly move?: readonly PipelineStep<"element.move">[]; readonly remove?: readonly PipelineStep<"element.remove">[] };
  readonly placement?: PlacementIntentOptions<typeof catalog>;
}

export interface TestClient {
  readonly remote: RemoteMap;
  readonly model: RemoteMap["model"];
  readonly controller: InteractionController<Promise<import("../../model/result").ApplyResult>>;
  readonly wire: Wire;
  disconnect(): void;
}

/** A client of the authority, as a game would build one: a remote model and an interaction layer on top. */
export async function client(authority: MapAuthority, options: ClientOptions = {}): Promise<TestClient> {
  const connection = connectInMemory(authority, { actor: options.actor });
  const { transport, wire } = instrument(connection.transport);
  const { actor, pipeline, placement, ...join } = options;
  const remote = await joinRemoteMap({ ...join, transport });
  const controller = createInteraction({
    model: remote.model,
    assets,
    describe: describeContext,
    nodes: () => sceneOf(remote.model),
    actor: () => actor,
  });
  registerElementIntents(controller as never);
  if (pipeline?.move) controller.usePipeline("element.move", pipeline.move);
  if (pipeline?.remove) controller.usePipeline("element.remove", pipeline.remove);
  registerPlacementIntent(controller as never, placement ?? { catalog });
  return {
    remote,
    model: remote.model,
    controller: controller as never,
    wire,
    disconnect() {
      remote.disconnect();
      connection.disconnect();
    },
  };
}

export const newAuthority = (overrides: Partial<MapAuthorityOptions> = {}): MapAuthority =>
  createMapAuthority({
    definition: world(),
    assets,
    placement: { catalog },
    onError: (error) => {
      throw error;
    },
    ...overrides,
  });
