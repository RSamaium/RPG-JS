import type { AssetResolver } from "../model/assets";
import type { MapDefinition } from "../model/definition";
import { createMapModel, type MapChange, type MapModel } from "../model/model";
import type { PatchHandlers } from "../model/patches";
import type { MapPatch } from "../model/patches";
import type { ApplyFailure, ApplyResult } from "../model/result";
import type { Catalog } from "../interaction/catalog";
import { registerElementIntents } from "../interaction/builtin-intents";
import { createInteraction, type InteractionController } from "../interaction/controller";
import type { MapIntent } from "../interaction/intents";
import type { PipelineStep } from "../interaction/pipeline";
import { registerPlacementIntent, type PlacementIntentOptions } from "../interaction/placement";
import {
  parseClientMessage,
  type EffectTargetMessage,
  type ServerMessage,
} from "../protocol";
import { describeElement, describeEvent, type DescribeContext, type MapViewHooks, type SceneNode } from "../renderer/scene";
import { MapStoreCorruptError, type MapStore, type PatchEntry } from "./store";

/** A client connected to the authority. The authority does not care how: `send` is all it needs. */
export interface AuthoritySession {
  readonly id: string;
  /** Who is acting: whatever the game decides, handed to the steps of the pipelines. */
  readonly actor: unknown;
  send(message: ServerMessage): void;
}

export interface AuthorityConnection {
  readonly session: AuthoritySession;
  /** Gives the authority what the client sent. Anything that is not a valid message is ignored. */
  receive(raw: unknown): void;
  disconnect(): void;
}

export interface PersistOptions {
  readonly store: MapStore;
  /** Key of the map in the store. */
  readonly id: string;
  /** Write a snapshot every this many revisions. Defaults to 50. */
  readonly snapshotEvery?: number;
  /** Write a snapshot this long after the last change. Defaults to 1000. */
  readonly saveDelayMs?: number;
  /** Replaces `setTimeout`, so tests control time. Returns the function that cancels it. */
  readonly schedule?: (run: () => void, delayMs: number) => () => void;
  /**
   * The store already holds a snapshot of the state the authority starts from, so it does
   * not write one first. `restoreMapAuthority` sets it. Otherwise the authority writes the
   * starting snapshot itself, so that the changes it appends have something to follow.
   */
  readonly baseSaved?: boolean;
}

export interface MapAuthorityOptions<C extends Catalog<string> = Catalog<string>> {
  readonly definition: MapDefinition;
  /** Revision the map starts at. Defaults to 0. */
  readonly revision?: number;
  /**
   * What the map is made of. Sizes and hitboxes come from here, so assets must declare
   * a `size` or a `frame`: a server has no image to measure.
   */
  readonly assets: AssetResolver;
  readonly hooks?: MapViewHooks;
  /** Rules for every move and removal, whoever asks. The same steps the clients use to preview. */
  readonly pipeline?: {
    readonly move?: readonly PipelineStep<"element.move">[];
    readonly remove?: readonly PipelineStep<"element.remove">[];
  };
  /** What can be placed, and the rules for it. */
  readonly placement?: PlacementIntentOptions<C>;
  /** Handlers of the patch types features add (`terrainPatchHandlers`): the authority must know them to apply them. */
  readonly patchHandlers?: readonly PatchHandlers[];
  /** Registers more intents and pipelines, e.g. those of a custom feature. */
  readonly setup?: (controller: InteractionController) => void;
  /**
   * Whether this actor may send patches as they are (an editor, an undo). Never by default:
   * a client asks with intents, and the authority decides.
   */
  readonly trustPatches?: (actor: unknown) => boolean;
  /** Who made a change, in the words other players see. */
  readonly author?: (actor: unknown) => string | undefined;
  /** Changes kept to catch late clients up without sending the whole map. Defaults to 512. */
  readonly log?: number;
  readonly persist?: PersistOptions;
  /** Called after every change, whoever made it: the place to keep a physics world in step. */
  readonly onChange?: (change: MapChange) => void;
  readonly onError?: (error: unknown) => void;
  /** Changes to replay on top of `definition`, in order: what a store gives back after a restart. */
  readonly replay?: readonly PatchEntry[];
}

export interface MapAuthority {
  /** The truth. Never change it directly: use `apply`, so everybody hears about it. */
  readonly model: MapModel<ApplyResult>;
  readonly revision: number;
  readonly interaction: InteractionController;
  /** How many clients are connected. */
  readonly connections: number;
  connect(session: AuthoritySession): AuthorityConnection;
  /**
   * A change the game itself makes (a lever, a quest). It is trusted: no pipeline. Everybody
   * connected hears about it.
   */
  apply(patches: MapPatch | readonly MapPatch[]): ApplyResult;
  /** Runs intents through the pipelines on behalf of an actor, e.g. a non-player character. */
  submit(intents: MapIntent | readonly MapIntent[], actor?: unknown): ApplyResult | ApplyFailure;
  /** Shows a short effect to everybody connected. It is not kept. */
  effect(target: EffectTargetMessage, name: string, params?: Readonly<Record<string, unknown>>): void;
  /** The map as it is now, as a message. */
  snapshot(): ServerMessage;
  /** Writes what is pending to the store. */
  flush(): Promise<void>;
  /** Flushes, then stops. */
  destroy(): Promise<void>;
}

const DEFAULT_LOG = 512;
const DEFAULT_SNAPSHOT_EVERY = 50;
const DEFAULT_SAVE_DELAY = 1000;

const sceneOf = (state: MapDefinition, context: DescribeContext): SceneNode[] => [
  ...state.elements.flatMap((element) => describeElement(element, context) ?? []),
  ...state.events.flatMap((event) => describeEvent(event, context) ?? []),
];

/**
 * The authority over one map: it holds the truth, decides what clients may do, tells
 * everybody what became true, catches late clients up and keeps the map between
 * restarts. It knows nothing of any framework: connect it to whatever carries messages.
 */
export function createMapAuthority<C extends Catalog<string> = Catalog<string>>(options: MapAuthorityOptions<C>): MapAuthority {
  const reportError = options.onError ?? ((error: unknown) => console.error(error));
  const model = createMapModel(options.definition, {
    ...(options.revision !== undefined ? { revision: options.revision } : {}),
    ...(options.patchHandlers ? { patchHandlers: options.patchHandlers } : {}),
    // The authority has nothing to undo: clients keep their own history.
    history: false,
    onListenerError: reportError,
  });

  const describeContext: DescribeContext = { assets: options.assets, ...(options.hooks ? { hooks: options.hooks } : {}) };
  const sessions = new Set<AuthoritySession>();
  let acting: { session: AuthoritySession; requestId: string | undefined } | undefined;
  let destroyed = false;

  const controller = createInteraction({
    model,
    assets: options.assets,
    describe: describeContext,
    nodes: () => sceneOf(model.state, describeContext),
    actor: () => acting?.session.actor,
    onError: reportError,
  });
  registerElementIntents(controller);
  if (options.pipeline?.move) controller.usePipeline("element.move", options.pipeline.move);
  if (options.pipeline?.remove) controller.usePipeline("element.remove", options.pipeline.remove);
  if (options.placement) registerPlacementIntent(controller, options.placement);
  options.setup?.(controller);

  // Changes made before anybody listens: what a restart replays.
  for (const entry of options.replay ?? []) {
    if (entry.revision !== model.revision + 1) {
      throw new MapStoreCorruptError(`Expected revision ${model.revision + 1}, found ${entry.revision} while restoring the map`);
    }
    const result = model.apply(entry.patches);
    if (!result.ok) throw new MapStoreCorruptError(`Revision ${entry.revision} cannot be replayed: ${result.rejection.message}`);
  }

  const logLimit = Math.max(0, options.log ?? DEFAULT_LOG);
  const patchLog: PatchEntry[] = [];

  const send = (session: AuthoritySession, message: ServerMessage): void => {
    try {
      session.send(message);
    } catch (error) {
      reportError(error);
    }
  };
  const broadcast = (message: ServerMessage): void => {
    for (const session of [...sessions]) send(session, message);
  };

  // --- persistence
  const persist = options.persist;
  const snapshotEvery = Math.max(1, persist?.snapshotEvery ?? DEFAULT_SNAPSHOT_EVERY);
  const saveDelay = persist?.saveDelayMs ?? DEFAULT_SAVE_DELAY;
  const schedule =
    persist?.schedule ??
    ((run: () => void, delayMs: number) => {
      const handle = setTimeout(run, delayMs);
      return () => clearTimeout(handle);
    });
  let lastSnapshotRevision = model.revision - (options.replay?.length ?? 0);
  let cancelScheduled: (() => void) | undefined;
  let queue: Promise<void> = Promise.resolve();

  const enqueue = (work: () => Promise<void>): void => {
    queue = queue.then(work).catch(reportError);
  };
  if (persist && !persist.baseSaved) {
    const base = { definition: model.getDefinition(), revision: model.revision };
    enqueue(() => persist.store.save(persist.id, base));
  }
  const saveSnapshot = (): void => {
    if (!persist) return;
    cancelScheduled?.();
    cancelScheduled = undefined;
    const snapshot = { definition: model.getDefinition(), revision: model.revision };
    lastSnapshotRevision = snapshot.revision;
    enqueue(() => persist.store.save(persist.id, snapshot));
  };

  // --- what everybody must hear about
  const unsubscribe = model.subscribe((change) => {
    if (change.reset) return;
    const entry: PatchEntry = { revision: change.revision, patches: change.patches };
    if (logLimit > 0) {
      patchLog.push(entry);
      if (patchLog.length > logLimit) patchLog.splice(0, patchLog.length - logLimit);
    }

    const author = acting ? options.author?.(acting.session.actor) : undefined;
    const base = {
      type: "patches" as const,
      revision: change.revision,
      patches: change.patches,
      ...(author !== undefined ? { author } : {}),
    };
    // The request id goes only to whoever asked: it is how they recognise their own change.
    for (const session of [...sessions]) {
      send(session, acting && acting.requestId !== undefined && acting.session === session ? { ...base, requestId: acting.requestId } : base);
    }

    if (persist) {
      if (persist.store.append) enqueue(() => persist.store.append!(persist.id, entry));
      if (change.revision - lastSnapshotRevision >= snapshotEvery) saveSnapshot();
      else {
        cancelScheduled?.();
        cancelScheduled = schedule(saveSnapshot, saveDelay);
      }
    }
    try {
      options.onChange?.(change);
    } catch (error) {
      reportError(error);
    }
  });

  const snapshotMessage = (): ServerMessage => ({ type: "snapshot", revision: model.revision, definition: model.getDefinition() });

  const catchUp = (session: AuthoritySession, since: number | undefined): void => {
    if (since === model.revision) return send(session, { type: "synced", revision: model.revision });
    const oldest = patchLog[0]?.revision;
    const canReplay = since !== undefined && since < model.revision && oldest !== undefined && since + 1 >= oldest;
    if (!canReplay) return send(session, snapshotMessage());
    for (const entry of patchLog) {
      if (entry.revision > since) send(session, { type: "patches", revision: entry.revision, patches: entry.patches });
    }
    send(session, { type: "synced", revision: model.revision });
  };

  const reject = (session: AuthoritySession, id: string, failure: ApplyFailure): void =>
    send(session, {
      type: "rejected",
      id,
      reason: failure.rejection.code,
      message: failure.rejection.message,
      ...(failure.rejection.patchIndex !== undefined ? { patchIndex: failure.rejection.patchIndex } : {}),
    });

  const handle = (session: AuthoritySession, raw: unknown): void => {
    if (destroyed || !sessions.has(session)) return;
    const message = parseClientMessage(raw);
    if (!message) return;

    switch (message.type) {
      case "sync":
        return catchUp(session, message.since);
      case "intent": {
        acting = { session, requestId: message.id };
        try {
          const result = controller.submit(message.intents);
          if (!result.ok) reject(session, message.id, result);
        } finally {
          acting = undefined;
        }
        return;
      }
      case "patches": {
        if (!options.trustPatches?.(session.actor)) {
          return reject(session, message.id, {
            ok: false,
            rejection: { code: "patches-not-allowed", message: "Only intents are accepted from this client" },
          });
        }
        acting = { session, requestId: message.id };
        try {
          const result = model.apply(message.patches);
          if (!result.ok) reject(session, message.id, result);
        } finally {
          acting = undefined;
        }
      }
    }
  };

  return {
    model,
    get revision() {
      return model.revision;
    },
    interaction: controller,
    get connections() {
      return sessions.size;
    },
    connect(session) {
      sessions.add(session);
      // The client gets the map at once, without having to ask.
      send(session, snapshotMessage());
      return {
        session,
        receive: (raw) => handle(session, raw),
        disconnect: () => void sessions.delete(session),
      };
    },
    apply: (patches) => model.apply(patches),
    submit(intents, actor) {
      const before = acting;
      acting = { session: { id: "server", actor, send: () => undefined }, requestId: undefined };
      try {
        return controller.submit(intents);
      } finally {
        acting = before;
      }
    },
    effect(target, name, params) {
      broadcast({ type: "effect", target, name, ...(params ? { params } : {}) });
    },
    snapshot: snapshotMessage,
    async flush() {
      if (persist && model.revision > lastSnapshotRevision) saveSnapshot();
      await queue;
    },
    async destroy() {
      if (destroyed) return;
      await this.flush();
      destroyed = true;
      unsubscribe();
      cancelScheduled?.();
      controller.destroy();
      sessions.clear();
    },
  };
}

/**
 * Brings a map back from a store, or starts it from `definition` when the store has
 * nothing yet. Changes written after the last snapshot are replayed.
 */
export async function restoreMapAuthority<C extends Catalog<string> = Catalog<string>>(
  options: MapAuthorityOptions<C> & { readonly persist: PersistOptions },
): Promise<MapAuthority> {
  const { store, id } = options.persist;
  const stored = await store.load(id);
  if (!stored) {
    // A snapshot first, so that changes appended later have something to follow.
    await store.save(id, { definition: options.definition, revision: options.revision ?? 0 });
    return createMapAuthority({ ...options, persist: { ...options.persist, baseSaved: true } });
  }
  return createMapAuthority({
    ...options,
    persist: { ...options.persist, baseSaved: true },
    definition: stored.snapshot.definition,
    revision: stored.snapshot.revision,
    replay: stored.patches,
  });
}
