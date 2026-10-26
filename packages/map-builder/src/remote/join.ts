import { createMapModel, type MapModel, type MapModelOptions } from "../model/model";
import type { ApplyResult } from "../model/result";
import type { MapTransport } from "../protocol";
import { remoteCommitter, type RemoteCommitter, type RemoteCommitterOptions, type RemoteEffect } from "./committer";

export interface JoinRemoteMapOptions extends Omit<RemoteCommitterOptions, "transport"> {
  readonly transport: MapTransport;
  /** Options of the model, other than the committer and the revision, which come from the authority. */
  readonly model?: Omit<MapModelOptions, "committer" | "revision">;
}

export interface RemoteMap {
  /** The map as the authority has it. Changes go through the authority: `apply` answers when it has decided. */
  readonly model: MapModel<Promise<ApplyResult>>;
  readonly committer: RemoteCommitter;
  /** Stops listening to the authority. */
  disconnect(): void;
}

/**
 * Joins the map of an authority: asks for it, waits for it, and returns a model that
 * stays in step with everybody else's changes.
 */
export async function joinRemoteMap(options: JoinRemoteMapOptions): Promise<RemoteMap> {
  const committer = remoteCommitter(options);
  // Ask after listening: the authority may also send the map on its own, on connection.
  const waiting = committer.nextSnapshot();
  options.transport.send({ type: "sync" });

  let first;
  try {
    first = await waiting;
  } catch (error) {
    committer.disconnect();
    throw error;
  }

  const model = createMapModel(first.definition, { ...options.model, committer, revision: first.revision });
  return { model, committer, disconnect: () => committer.disconnect() };
}

/** Anything that can play an effect on an element or an event: a view's `effects`. */
export interface EffectPlayer {
  play(target: RemoteEffect["target"], name: string, params?: Record<string, unknown>): unknown;
}

/** Shows the effects the authority plays: `bindRemoteEffects(remote, view.effects)`. Returns the function that stops. */
export function bindRemoteEffects(remote: { readonly committer: RemoteCommitter }, effects: EffectPlayer): () => void {
  return remote.committer.onEffect((effect) => void effects.play(effect.target, effect.name, effect.params as Record<string, unknown> | undefined));
}
