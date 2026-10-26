import { localCommitter, type CommitHost, type IntegrateOptions, type MapCommitter } from "./committer";
import { coreHandlers } from "./core-patches";
import type { MapDefinition, MapElement, MapEvent, MapState } from "./definition";
import type { MapRejection } from "./errors";
import { createHistory, type MapHistory } from "./history";
import { cloneJson, type JsonValue } from "./json";
import { parseMapDefinition } from "./parse";
import type { MapPatch, PatchHandler, PatchHandlers, PatchType } from "./patches";
import type { ApplyFailure, ApplyResult, MaybePromise, Unsubscribe } from "./result";

export interface MapChange {
  readonly revision: number;
  readonly patches: readonly MapPatch[];
  readonly inverse: readonly MapPatch[];
  readonly origin: "local" | "remote";
  /** State after the change. */
  readonly state: MapState;
  /**
   * The whole state was replaced (a snapshot from the authority): `patches` is empty
   * and whatever was derived from the previous state must be rebuilt.
   */
  readonly reset?: true;
}

export interface ApplyOptions {
  /** Consecutive `apply` calls with the same key become one undo step (a drag, a slider). */
  readonly coalesce?: string;
  /** The intents the patches come from. A committer that talks to an authority sends these. */
  readonly intents?: readonly unknown[];
}

export interface MapModelOptions {
  readonly committer?: MapCommitter<ApplyResult>;
  /** Handlers for the patch types features add. They cannot replace a built-in one. */
  readonly patchHandlers?: readonly PatchHandlers[];
  /** Revision the map starts at, e.g. the one of a server snapshot. Defaults to 0. */
  readonly revision?: number;
  /** Maximum number of undoable actions, or `false` to disable the history. Defaults to 50. */
  readonly history?: { readonly limit?: number } | false;
  /**
   * What to do with a patch computed against another revision than the current one:
   * `"reject"` (default) or `"rebase"` (apply it anyway, if it is still valid).
   */
  readonly onStale?: "reject" | "rebase";
  readonly onListenerError?: (error: unknown) => void;
}

export interface MapModel<R extends MaybePromise<ApplyResult> = ApplyResult> {
  /** Current state. Immutable: every change produces a new object. */
  readonly state: MapState;
  readonly revision: number;
  readonly history: MapHistory<R>;
  /**
   * Submits an intention. It goes through the committer, which decides where it
   * becomes a fact. A batch (an array) is atomic: all or nothing, one revision.
   */
  apply(input: MapPatch | readonly MapPatch[], options?: ApplyOptions): R;
  /** Deep copy of the current state, safe to serialize or mutate. */
  getDefinition(): MapDefinition;
  getElement(id: string): MapElement | undefined;
  getEvent(id: string): MapEvent | undefined;
  /** Framework-neutral: plugs into Angular signals, Vue, React or CanvasEngine. */
  subscribe(listener: (change: MapChange) => void): Unsubscribe;
}

export const DEFAULT_HISTORY_LIMIT = 50;

const reject = (rejection: MapRejection): ApplyFailure => ({ ok: false, rejection });

/**
 * Creates the model of a map: the single source of truth, changed only by patches.
 * The definition is validated and copied, so the model never shares structure with the caller.
 */
export function createMapModel(definition: MapDefinition, options?: MapModelOptions): MapModel<ApplyResult>;
export function createMapModel<R extends MaybePromise<ApplyResult>>(
  definition: MapDefinition,
  options: Omit<MapModelOptions, "committer"> & { readonly committer: MapCommitter<R> },
): MapModel<R>;
export function createMapModel(
  definition: MapDefinition,
  options: Omit<MapModelOptions, "committer"> & { readonly committer?: MapCommitter<MaybePromise<ApplyResult>> } = {},
): MapModel<MaybePromise<ApplyResult>> {
  type R = MaybePromise<ApplyResult>;
  const committer: MapCommitter<R> = options.committer ?? localCommitter();
  const onStale = options.onStale ?? "reject";
  const reportListenerError = options.onListenerError ?? ((error: unknown) => console.error(error));

  const handlers = new Map<string, PatchHandler<PatchType>>();
  const register = (set: PatchHandlers, locked: boolean): void => {
    for (const [type, handler] of Object.entries(set)) {
      if (!handler) continue;
      if (locked && handlers.has(type)) throw new Error(`Patch type "${type}" is already handled`);
      handlers.set(type, handler as PatchHandler<PatchType>);
    }
  };
  register(coreHandlers, false);
  for (const set of options.patchHandlers ?? []) register(set, true);

  let state: MapState = parseMapDefinition(definition);
  let revision = options.revision ?? 0;
  const listeners = new Set<(change: MapChange) => void>();

  const limit = options.history === false ? 0 : (options.history?.limit ?? DEFAULT_HISTORY_LIMIT);
  const controller = createHistory<R>({
    limit,
    dispatch: (patches) => committer.commit({ patches, record: false }),
    onListenerError: reportListenerError,
  });

  function integrate(patches: readonly MapPatch[], integrateOptions: IntegrateOptions = {}): ApplyResult {
    const origin = integrateOptions.origin ?? "local";
    if (patches.length === 0) {
      return reject({ code: "invalid-patch", message: "A batch must contain at least one patch" });
    }

    // Patches may come from the network: never trust their shape.
    const malformed = patches.findIndex((patch) => typeof patch !== "object" || patch === null);
    if (malformed >= 0) {
      return reject({ code: "invalid-patch", message: "A patch must be an object", patchIndex: malformed });
    }

    if (onStale === "reject") {
      const index = patches.findIndex((patch) => patch.baseRevision !== undefined && patch.baseRevision !== revision);
      if (index >= 0) {
        return reject({
          code: "stale-revision",
          message: `Patch was computed against revision ${patches[index]!.baseRevision}, current revision is ${revision}`,
          patchIndex: index,
        });
      }
    }
    if (integrateOptions.revision !== undefined && integrateOptions.revision !== revision + 1) {
      return reject({
        code: "revision-gap",
        message: `Expected revision ${revision + 1}, got ${integrateOptions.revision}`,
      });
    }

    // Handlers are pure, so working on a draft makes the batch atomic.
    let draft = state;
    let inverse: readonly MapPatch[] = [];
    for (const [index, patch] of patches.entries()) {
      const handler = typeof patch?.type === "string" ? handlers.get(patch.type) : undefined;
      if (!handler) {
        return reject({
          code: "unknown-patch",
          message: `No handler for patch type "${String(patch?.type)}"`,
          patchIndex: index,
        });
      }
      let outcome;
      try {
        outcome = handler.apply(draft, patch as never);
      } catch (error) {
        return reject({
          code: "invalid-patch",
          message: error instanceof Error ? error.message : String(error),
          patchIndex: index,
        });
      }
      if (!outcome.ok) return reject({ ...outcome.rejection, patchIndex: index });
      draft = outcome.state;
      // The inverse of a later patch must run before the inverse of an earlier one.
      inverse = [...outcome.inverse, ...inverse];
    }

    state = draft;
    revision = integrateOptions.revision ?? revision + 1;
    const result: ApplyResult = { ok: true, revision, patches, inverse };

    if (origin === "local" && integrateOptions.record !== false) {
      controller.record({ patches, inverse }, integrateOptions.coalesce);
    }
    const change: MapChange = { revision, patches, inverse, origin, state };
    for (const listener of [...listeners]) {
      try {
        listener(change);
      } catch (error) {
        reportListenerError(error);
      }
    }
    return result;
  }

  const host: CommitHost = {
    get state() {
      return state;
    },
    get revision() {
      return revision;
    },
    integrate,
    reset(next, nextRevision) {
      state = parseMapDefinition(next);
      revision = nextRevision;
      controller.history.clear();
      const change: MapChange = { revision, patches: [], inverse: [], origin: "remote", state, reset: true };
      for (const listener of [...listeners]) {
        try {
          listener(change);
        } catch (error) {
          reportListenerError(error);
        }
      }
    },
  };
  committer.attach(host);

  return {
    get state() {
      return state;
    },
    get revision() {
      return revision;
    },
    history: controller.history,
    apply(input, applyOptions) {
      const patches = Array.isArray(input) ? (input as readonly MapPatch[]) : [input as MapPatch];
      return committer.commit({
        patches,
        record: true,
        ...(applyOptions?.coalesce !== undefined ? { coalesce: applyOptions.coalesce } : {}),
        ...(applyOptions?.intents !== undefined ? { intents: applyOptions.intents } : {}),
      });
    },
    getDefinition: () => cloneJson(state as unknown as JsonValue) as unknown as MapDefinition,
    getElement: (id) => state.elements.find((element) => element.id === id),
    getEvent: (id) => state.events.find((entry) => entry.id === id),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
